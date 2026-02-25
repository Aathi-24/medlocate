import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateDistance } from "@/lib/distance";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
import { ArrowLeft, Navigation, BedDouble, User, Clock, MapPin, Activity } from "lucide-react";

const HospitalDetails = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const geo = useGeolocation();
  const [hospital, setHospital] = useState<Tables<"hospitals"> | null>(null);
  const [doctors, setDoctors] = useState<Tables<"doctors">[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!id) return;
    const [hRes, dRes] = await Promise.all([
      supabase.from("hospitals").select("*").eq("id", id).single(),
      supabase.from("doctors").select("*").eq("hospital_id", id),
    ]);
    if (hRes.data) setHospital(hRes.data);
    if (dRes.data) setDoctors(dRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    const ch1 = supabase
      .channel(`hospital-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "hospitals", filter: `id=eq.${id}` }, () => fetchData())
      .subscribe();

    const ch2 = supabase
      .channel(`doctors-${id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "doctors", filter: `hospital_id=eq.${id}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, [id]);

  const distance =
    hospital && geo.latitude && geo.longitude
      ? calculateDistance(geo.latitude, geo.longitude, hospital.latitude, hospital.longitude)
      : null;

  const sortedDoctors = [...doctors].sort((a, b) => {
    if (a.status === "available" && b.status !== "available") return -1;
    if (a.status !== "available" && b.status === "available") return 1;
    return 0;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    );
  }

  if (!hospital) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Hospital not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Activity className="h-5 w-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">MedLocate</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{hospital.name}</h1>
          {distance !== null && (
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> {distance} km away
            </p>
          )}
        </div>

        {/* Status */}
        <div className="flex flex-wrap gap-2">
          <StatusBadge available={hospital.emergency_available} label="Emergency" />
          <StatusBadge available={hospital.ot_available} label="OT" />
        </div>

        <Button
          onClick={() =>
            window.open(
              `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`,
              "_blank"
            )
          }
        >
          <Navigation className="h-4 w-4 mr-2" /> Get Directions
        </Button>

        {/* Beds - logged in only */}
        {user ? (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <BedDouble className="h-5 w-5 text-primary" /> Bed Availability
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold text-foreground">{hospital.general_beds}</p>
                  <p className="text-xs text-muted-foreground">General</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold text-foreground">{hospital.ac_beds}</p>
                  <p className="text-xs text-muted-foreground">AC</p>
                </div>
                <div className="rounded-lg bg-muted p-3">
                  <p className="text-2xl font-bold text-foreground">{hospital.private_beds}</p>
                  <p className="text-xs text-muted-foreground">Private</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm text-primary">
            <Link to="/login" className="font-medium underline">Login</Link> to see bed counts and doctor availability.
          </div>
        )}

        {/* Doctors - logged in only */}
        {user && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-5 w-5 text-primary" /> Doctors
              </CardTitle>
            </CardHeader>
            <CardContent>
              {sortedDoctors.length === 0 ? (
                <p className="text-sm text-muted-foreground">No doctors listed.</p>
              ) : (
                <div className="space-y-3">
                  {sortedDoctors.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{doc.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {doc.shift_start} – {doc.shift_end}
                        </p>
                      </div>
                      <Badge
                        variant={doc.status === "available" ? "default" : "secondary"}
                      >
                        {doc.status === "available" ? "Available" : "Upcoming"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default HospitalDetails;
