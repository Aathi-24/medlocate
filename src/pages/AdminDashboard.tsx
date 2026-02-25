import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tables } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { Activity, ArrowLeft, LogOut, Plus, Trash2, Edit2, Save, X, Clock } from "lucide-react";

const AdminDashboard = () => {
  const { user, role, adminHospitalId, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [hospital, setHospital] = useState<Tables<"hospitals"> | null>(null);
  const [doctors, setDoctors] = useState<Tables<"doctors">[]>([]);
  const [loading, setLoading] = useState(true);

  // Bed editing
  const [generalBeds, setGeneralBeds] = useState(0);
  const [acBeds, setAcBeds] = useState(0);
  const [privateBeds, setPrivateBeds] = useState(0);

  // Add doctor form
  const [showAddDoctor, setShowAddDoctor] = useState(false);
  const [newDocName, setNewDocName] = useState("");
  const [newDocStart, setNewDocStart] = useState("09:00 AM");
  const [newDocEnd, setNewDocEnd] = useState("05:00 PM");
  const [newDocStatus, setNewDocStatus] = useState<"available" | "upcoming">("available");

  // Edit doctor
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDocStart, setEditDocStart] = useState("");
  const [editDocEnd, setEditDocEnd] = useState("");
  const [editDocStatus, setEditDocStatus] = useState<"available" | "upcoming">("available");

  useEffect(() => {
    if (!authLoading && (!user || role !== "admin")) {
      navigate("/");
    }
  }, [authLoading, user, role]);

  const fetchData = async () => {
    if (!adminHospitalId) return;
    const [hRes, dRes] = await Promise.all([
      supabase.from("hospitals").select("*").eq("id", adminHospitalId).single(),
      supabase.from("doctors").select("*").eq("hospital_id", adminHospitalId),
    ]);
    if (hRes.data) {
      setHospital(hRes.data);
      setGeneralBeds(hRes.data.general_beds);
      setAcBeds(hRes.data.ac_beds);
      setPrivateBeds(hRes.data.private_beds);
    }
    if (dRes.data) setDoctors(dRes.data);
    setLoading(false);
  };

  useEffect(() => {
    if (adminHospitalId) fetchData();
  }, [adminHospitalId]);

  const toggleEmergency = async () => {
    if (!hospital) return;
    await supabase.from("hospitals").update({ emergency_available: !hospital.emergency_available }).eq("id", hospital.id);
    fetchData();
  };

  const toggleOT = async () => {
    if (!hospital) return;
    await supabase.from("hospitals").update({ ot_available: !hospital.ot_available }).eq("id", hospital.id);
    fetchData();
  };

  const updateBeds = async () => {
    if (!hospital) return;
    await supabase.from("hospitals").update({
      general_beds: generalBeds,
      ac_beds: acBeds,
      private_beds: privateBeds,
    }).eq("id", hospital.id);
    toast({ title: "Beds updated" });
    fetchData();
  };

  const addDoctor = async () => {
    if (!adminHospitalId || !newDocName.trim()) return;
    await supabase.from("doctors").insert({
      hospital_id: adminHospitalId,
      name: newDocName.trim(),
      shift_start: newDocStart,
      shift_end: newDocEnd,
      status: newDocStatus,
    });
    setShowAddDoctor(false);
    setNewDocName("");
    toast({ title: "Doctor added" });
    fetchData();
  };

  const saveEditDoctor = async (docId: string) => {
    await supabase.from("doctors").update({
      shift_start: editDocStart,
      shift_end: editDocEnd,
      status: editDocStatus,
    }).eq("id", docId);
    setEditingDocId(null);
    toast({ title: "Doctor updated" });
    fetchData();
  };

  const deleteDoctor = async (docId: string) => {
    await supabase.from("doctors").delete().eq("id", docId);
    toast({ title: "Doctor removed" });
    fetchData();
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">No hospital assigned to your account.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Activity className="h-5 w-5 text-primary" />
            <span className="text-sm font-semibold">Admin Dashboard</span>
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-1" />Logout
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <h2 className="text-xl font-bold text-foreground">{hospital.name}</h2>

        {/* Toggle Emergency / OT */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ward Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>Emergency Ward</Label>
              <Switch checked={hospital.emergency_available} onCheckedChange={toggleEmergency} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Operation Theatre</Label>
              <Switch checked={hospital.ot_available} onCheckedChange={toggleOT} />
            </div>
          </CardContent>
        </Card>

        {/* Beds */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bed Counts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">General</Label>
                <Input type="number" min={0} value={generalBeds} onChange={(e) => setGeneralBeds(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AC</Label>
                <Input type="number" min={0} value={acBeds} onChange={(e) => setAcBeds(+e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Private</Label>
                <Input type="number" min={0} value={privateBeds} onChange={(e) => setPrivateBeds(+e.target.value)} />
              </div>
            </div>
            <Button size="sm" onClick={updateBeds}>
              <Save className="h-4 w-4 mr-1" /> Save Beds
            </Button>
          </CardContent>
        </Card>

        {/* Doctors */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Doctors</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setShowAddDoctor(!showAddDoctor)}>
              {showAddDoctor ? <X className="h-4 w-4 mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
              {showAddDoctor ? "Cancel" : "Add Doctor"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {showAddDoctor && (
              <div className="space-y-3 rounded-lg border p-3">
                <Input placeholder="Doctor name" value={newDocName} onChange={(e) => setNewDocName(e.target.value)} />
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Shift Start</Label>
                    <Input value={newDocStart} onChange={(e) => setNewDocStart(e.target.value)} placeholder="9:00 AM" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Shift End</Label>
                    <Input value={newDocEnd} onChange={(e) => setNewDocEnd(e.target.value)} placeholder="5:00 PM" />
                  </div>
                </div>
                <Select value={newDocStatus} onValueChange={(v) => setNewDocStatus(v as "available" | "upcoming")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={addDoctor} disabled={!newDocName.trim()}>
                  <Plus className="h-4 w-4 mr-1" /> Add
                </Button>
              </div>
            )}

            {doctors.length === 0 && !showAddDoctor && (
              <p className="text-sm text-muted-foreground">No doctors added yet.</p>
            )}

            {doctors.map((doc) => (
              <div key={doc.id} className="rounded-lg border p-3">
                {editingDocId === doc.id ? (
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{doc.name}</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input value={editDocStart} onChange={(e) => setEditDocStart(e.target.value)} />
                      <Input value={editDocEnd} onChange={(e) => setEditDocEnd(e.target.value)} />
                    </div>
                    <Select value={editDocStatus} onValueChange={(v) => setEditDocStatus(v as "available" | "upcoming")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Available</SelectItem>
                        <SelectItem value="upcoming">Upcoming</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => saveEditDoctor(doc.id)}>
                        <Save className="h-3.5 w-3.5 mr-1" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingDocId(null)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">{doc.name}</p>
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {doc.shift_start} – {doc.shift_end}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={doc.status === "available" ? "default" : "secondary"}>
                        {doc.status}
                      </Badge>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8"
                        onClick={() => {
                          setEditingDocId(doc.id);
                          setEditDocStart(doc.shift_start);
                          setEditDocEnd(doc.shift_end);
                          setEditDocStatus(doc.status as "available" | "upcoming");
                        }}
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteDoctor(doc.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
