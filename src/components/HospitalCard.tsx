import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { MapPin, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tables } from "@/integrations/supabase/types";

interface HospitalCardProps {
  hospital: Tables<"hospitals">;
  distance: number | null;
}

export function HospitalCard({ hospital, distance }: HospitalCardProps) {
  const navigate = useNavigate();

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => navigate(`/hospital/${hospital.id}`)}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-semibold text-foreground leading-tight">
              {hospital.name}
            </h3>
            {distance !== null && (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {distance} km away
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <StatusBadge available={hospital.emergency_available} label="Emergency" />
              <StatusBadge available={hospital.ot_available} label="OT" />
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                `https://www.google.com/maps/dir/?api=1&destination=${hospital.latitude},${hospital.longitude}`,
                "_blank"
              );
            }}
          >
            <Navigation className="h-4 w-4 mr-1" />
            Directions
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
