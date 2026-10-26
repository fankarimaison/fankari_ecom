"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, HelpCircle, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiDelete, apiPost, apiPut, type Faq } from "../api";
import { useFaqs } from "../hooks";
import { PanelLoading } from "../views/admin";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Admin → FAQ: add, edit, reorder, show/hide and delete questions. */
export function AdminFaq() {
  const { data: faqs, isLoading } = useFaqs();
  const [editing, setEditing] = useState<Faq | "new" | null>(null);
  const [deleting, setDeleting] = useState<Faq | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const onError = (title: string) => (error: unknown) =>
    toast({
      title,
      description: error instanceof Error ? error.message : "Please try again.",
      variant: "destructive",
    });

  const patch = useMutation({
    mutationFn: ({ id, ...body }: { id: string; sortOrder?: number; published?: boolean }) =>
      apiPut<{ faq: Faq }>(`/api/faqs/${id}`, body),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["faqs"] }),
    onError: onError("Could not update the question"),
  });

  // Move one question up/down: renumber the list 1…n in its new order and save
  // only the rows whose position changed
  const move = useMutation({
    mutationFn: async ({ from, to }: { from: number; to: number }) => {
      const next = [...(faqs ?? [])];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      for (const [i, f] of next.entries()) {
        if (f.sortOrder !== i + 1) await apiPut(`/api/faqs/${f.id}`, { sortOrder: i + 1 });
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: ["faqs"] }),
    onError: onError("Could not reorder"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<{ success: boolean }>(`/api/faqs/${id}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast({ title: "Question deleted" });
      setDeleting(null);
    },
    onError: (error) => {
      onError("Could not delete the question")(error);
      setDeleting(null);
    },
  });

  if (isLoading) return <PanelLoading />;
  const list = faqs ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Shown on the FAQ page in this order. Hidden questions stay here but not in the shop.
        </p>
        <Button className="min-h-10 rounded-full" onClick={() => setEditing("new")}>
          <Plus className="size-4" aria-hidden /> Add question
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-14 text-center">
          <HelpCircle className="size-8 text-muted-foreground" aria-hidden />
          <p className="font-medium">No questions yet</p>
          <p className="text-sm text-muted-foreground">Add the questions customers ask most.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((f, i) => (
            <li key={f.id}>
              <Card className={cn("gap-0 p-0", !f.published && "opacity-70")}>
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="flex shrink-0 flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full"
                      disabled={i === 0 || move.isPending}
                      onClick={() => move.mutate({ from: i, to: i - 1 })}
                      aria-label="Move up"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 rounded-full"
                      disabled={i === list.length - 1 || move.isPending}
                      onClick={() => move.mutate({ from: i, to: i + 1 })}
                      aria-label="Move down"
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium">{f.question}</p>
                      {!f.published && <Badge variant="secondary">Hidden</Badge>}
                    </div>
                    <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
                      {f.answer}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Switch
                      checked={f.published}
                      disabled={patch.isPending}
                      onCheckedChange={(published) => patch.mutate({ id: f.id, published })}
                      aria-label={f.published ? "Hide from FAQ page" : "Show on FAQ page"}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-full"
                      onClick={() => setEditing(f)}
                      aria-label="Edit question"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-9 rounded-full text-muted-foreground hover:text-destructive"
                      onClick={() => setDeleting(f)}
                      aria-label="Delete question"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <FaqDialog
          key={editing === "new" ? "new" : editing.id}
          faq={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleting?.question}” will be removed from the FAQ page. To keep it for later,
              hide it with the switch instead.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (deleting) remove.mutate(deleting.id);
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {remove.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FaqDialog({ faq, onClose }: { faq: Faq | null; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [question, setQuestion] = useState(faq?.question ?? "");
  const [answer, setAnswer] = useState(faq?.answer ?? "");
  const [published, setPublished] = useState(faq?.published ?? true);

  const save = useMutation({
    mutationFn: () => {
      const body = { question, answer, published };
      return faq
        ? apiPut<{ faq: Faq }>(`/api/faqs/${faq.id}`, body)
        : apiPost<{ faq: Faq }>("/api/faqs", body);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["faqs"] });
      toast({ title: faq ? "Question saved" : "Question added" });
      onClose();
    },
    onError: (error) => {
      toast({
        title: "Could not save the question",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  const invalid = !question.trim() || !answer.trim();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {faq ? "Edit question" : "Add question"}
          </DialogTitle>
          <DialogDescription>Shown on the FAQ page.</DialogDescription>
        </DialogHeader>
        <form
          id="faq-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!invalid) save.mutate();
          }}
        >
          <div>
            <Label htmlFor="faq-question">Question</Label>
            <Input
              id="faq-question"
              className="mt-1.5 min-h-10"
              maxLength={300}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="faq-answer">Answer</Label>
            <Textarea
              id="faq-answer"
              rows={6}
              maxLength={4000}
              className="mt-1.5"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">Line breaks are kept.</p>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2.5">
            <Label htmlFor="faq-published" className="cursor-pointer">
              Show on the FAQ page
            </Label>
            <Switch id="faq-published" checked={published} onCheckedChange={setPublished} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" className="min-h-10 rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="faq-form"
            className="min-h-10 rounded-full px-6"
            disabled={invalid || save.isPending}
          >
            {save.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {faq ? "Save" : "Add question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
