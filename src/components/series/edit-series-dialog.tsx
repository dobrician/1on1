"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useApiErrorToast } from "@/lib/i18n/api-error-toast";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  cadence: z.enum(["weekly", "biweekly", "monthly", "custom"]),
  cadenceCustomDays: z.number().int().min(1).max(365).optional(),
  preferredDay: z.string().optional(),
  preferredTime: z.string().optional(),
  defaultDurationMinutes: z.number().int().min(15).max(180),
  nextSessionAt: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface EditSeriesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  series: {
    id: string;
    cadence: string;
    cadenceCustomDays: number | null;
    preferredDay: string | null;
    preferredTime: string | null;
    defaultDurationMinutes: number;
    nextSessionAt: string | null;
  };
}

function toLocalDatetime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function EditSeriesDialog({
  open,
  onOpenChange,
  series,
}: EditSeriesDialogProps) {
  const t = useTranslations("sessions");
  const { showApiError } = useApiErrorToast();
  const router = useRouter();

  const cadenceOptions = [
    { value: "weekly", label: t("form.weekly") },
    { value: "biweekly", label: t("form.biweekly") },
    { value: "monthly", label: t("form.monthly") },
    { value: "custom", label: t("form.custom") },
  ] as const;

  const dayOptions = [
    { value: "mon", label: t("form.monday") },
    { value: "tue", label: t("form.tuesday") },
    { value: "wed", label: t("form.wednesday") },
    { value: "thu", label: t("form.thursday") },
    { value: "fri", label: t("form.friday") },
  ] as const;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cadence: series.cadence as FormValues["cadence"],
      cadenceCustomDays: series.cadenceCustomDays ?? undefined,
      preferredDay: series.preferredDay ?? undefined,
      preferredTime: series.preferredTime ?? undefined,
      defaultDurationMinutes: series.defaultDurationMinutes,
      nextSessionAt: toLocalDatetime(series.nextSessionAt),
    },
  });

  const cadence = form.watch("cadence");

  const updateSeries = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload: Record<string, unknown> = {
        cadence: values.cadence,
        defaultDurationMinutes: values.defaultDurationMinutes,
        preferredDay: values.preferredDay || null,
        preferredTime: values.preferredTime || null,
      };
      if (values.cadence === "custom") {
        payload.cadenceCustomDays = values.cadenceCustomDays;
      }
      // Ensure HH:MM format (strip seconds if present)
      if (payload.preferredTime && typeof payload.preferredTime === "string") {
        payload.preferredTime = (payload.preferredTime as string).slice(0, 5);
      }
      if (values.nextSessionAt) {
        payload.nextSessionAt = new Date(values.nextSessionAt).toISOString();
      }
      const res = await fetch(`/api/series/${series.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update series");
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("detail.seriesUpdated"));
      onOpenChange(false);
      router.refresh();
    },
    onError: (error: Error) => {
      showApiError(error);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("detail.editSeries")}</DialogTitle>
          <DialogDescription>{t("detail.editSeriesDesc")}</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => updateSeries.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="cadence"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.cadence")}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid grid-cols-2 gap-2"
                    >
                      {cadenceOptions.map((o) => (
                        <div key={o.value} className="flex items-center">
                          <RadioGroupItem
                            value={o.value}
                            id={`edit-cadence-${o.value}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`edit-cadence-${o.value}`}
                            className="flex w-full cursor-pointer items-center justify-center rounded-md border-2 border-muted bg-transparent px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary"
                          >
                            {o.label}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {cadence === "custom" && (
              <FormField
                control={form.control}
                name="cadenceCustomDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.customDays")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={field.value ?? ""}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseInt(e.target.value, 10) : undefined
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="preferredDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.preferredDay")}</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("form.noPreference")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {dayOptions.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="preferredTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("form.preferredTime")}</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="defaultDurationMinutes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("form.duration")}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={15}
                      max={180}
                      step={5}
                      value={field.value}
                      onChange={(e) =>
                        field.onChange(
                          e.target.value ? parseInt(e.target.value, 10) : 30
                        )
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nextSessionAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("detail.nextSessionDate")}</FormLabel>
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value ?? ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("form.cancel")}
              </Button>
              <Button type="submit" disabled={updateSeries.isPending}>
                {updateSeries.isPending
                  ? t("detail.saving")
                  : t("detail.save")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
