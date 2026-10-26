"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Inbox, Mail, Phone, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";
import { apiGet, apiPatch, type ContactRequest } from "../api";
import { PanelLoading } from "../views/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** "Contact us" requests from the storefront, newest first. */
export function AdminMessages() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: requests, isLoading } = useQuery({
    queryKey: ["admin-messages"],
    queryFn: async () => {
      const data = await apiGet<{ requests: ContactRequest[] }>("/api/admin/contact");
      return data.requests;
    },
  });

  const setHandled = useMutation({
    mutationFn: ({ id, handled }: { id: string; handled: boolean }) =>
      apiPatch<{ success: boolean }>(`/api/admin/contact/${id}`, { handled }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin-messages"] }),
    onError: (error) => {
      toast({
        title: "Could not update the message",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) return <PanelLoading />;

  if (!requests || requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-14 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium">No messages yet</p>
        <p className="text-sm text-muted-foreground">
          Requests sent from the Contact us page appear here.
        </p>
      </div>
    );
  }

  const open = requests.filter((r) => !r.handled).length;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {open} open · {requests.length} total
      </p>
      <ul className="space-y-3">
        {requests.map((r) => (
          <li key={r.id}>
            <Card className={cn("gap-0 p-0", r.handled && "opacity-70")}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">{r.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-accent-foreground">
                        <Phone className="size-3.5" aria-hidden /> {r.phone}
                      </a>
                      <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:text-accent-foreground">
                        <Mail className="size-3.5" aria-hidden /> {r.email}
                      </a>
                      <span>{formatDate(r.createdAt)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.handled ? (
                      <Badge variant="secondary">Handled</Badge>
                    ) : (
                      <Badge className="bg-amber-600 text-amber-50">New</Badge>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-9 rounded-full"
                      disabled={setHandled.isPending}
                      onClick={() => setHandled.mutate({ id: r.id, handled: !r.handled })}
                    >
                      {r.handled ? (
                        <>
                          <RotateCcw className="size-3.5" aria-hidden /> Reopen
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5" aria-hidden /> Mark handled
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm leading-relaxed">
                  {r.message}
                </p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
