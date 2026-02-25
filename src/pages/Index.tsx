import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useGeolocation } from "@/hooks/useGeolocation";
import { calculateDistance } from "@/lib/distance";
import { HospitalCard } from "@/components/HospitalCard";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tables } from "@/integrations/supabase/types";
import { LogIn, LogOut, LayoutDashboard, Search, MapPin, Activity } from "lucide-react";

const Index = () => {
  const { user, role, signOut, loading: authLoading } = useAuth();
  const geo = useGeolocation();
  const [hospitals, setHospitals] = useState<Tables<"hospitals">[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(true);
  const [search, setSearch] = useState("");
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  const fetchHospitals = async () => {
    const { data } = await supabase.from("hospitals").select("*");
    if (data) setHospitals(data);
    setLoadingHospitals(false);
  };

  useEffect(() => {
    fetchHospitals();

    const channel = supabase
      .channel("hospitals-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "hospitals" }, () => {
        fetchHospitals();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const sortedHospitals = useMemo(() => {
    let list = hospitals.map((h) => ({
      ...h,
      distance:
        geo.latitude && geo.longitude
          ? calculateDistance(geo.latitude, geo.longitude, h.latitude, h.longitude)
          : null,
    }));

    if (search) {
      list = list.filter((h) =>
        h.name.toLowerCase().includes(search.toLowerCase())
      );
    }
    if (emergencyOnly) {
      list = list.filter((h) => h.emergency_available);
    }

    list.sort((a, b) => (a.distance ?? 9999) - (b.distance ?? 9999));
    return list;
  }, [hospitals, geo.latitude, geo.longitude, search, emergencyOnly]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-foreground">MedLocate</h1>
          </div>
          <div className="flex items-center gap-2">
            {!authLoading && (
              <>
                {user && role === "admin" && (
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/admin"><LayoutDashboard className="h-4 w-4 mr-1" />Dashboard</Link>
                  </Button>
                )}
                {user ? (
                  <Button variant="ghost" size="sm" onClick={signOut}>
                    <LogOut className="h-4 w-4 mr-1" />Logout
                  </Button>
                ) : (
                  <Button variant="default" size="sm" asChild>
                    <Link to="/login"><LogIn className="h-4 w-4 mr-1" />Login</Link>
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">
        {/* Location status */}
        {geo.loading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 animate-pulse" /> Detecting your location…
          </p>
        )}
        {geo.error && (
          <p className="text-sm text-destructive">
            Location unavailable: {geo.error}. Hospitals shown without distance.
          </p>
        )}

        {/* Search & filter */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search hospitals…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Switch id="emergency" checked={emergencyOnly} onCheckedChange={setEmergencyOnly} />
            <Label htmlFor="emergency" className="text-xs whitespace-nowrap">Emergency only</Label>
          </div>
        </div>

        {!user && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-primary">
            <Link to="/login" className="font-medium underline">Login</Link> to view bed counts and doctor availability.
          </div>
        )}

        {/* Hospital list */}
        {loadingHospitals ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : sortedHospitals.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">No hospitals found.</p>
        ) : (
          <div className="space-y-3">
            {sortedHospitals.map((h) => (
              <HospitalCard key={h.id} hospital={h} distance={h.distance} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
