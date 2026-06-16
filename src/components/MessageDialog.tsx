"use client";

import { useMemo, useState, useEffect } from "react";
import { MessageCircle, Phone, AlertCircle } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea, Select, Label } from "@/components/ui/input";
import {
  MESSAGE_TEMPLATES,
  buildWhatsAppLink,
  getTemplate,
  type TemplateVars,
} from "@/lib/whatsapp";

export interface MessageRecipient {
  name: string;
  phone?: string;
  vars?: TemplateVars;
  defaultTemplateId?: string;
}

export function MessageDialog({
  open,
  onClose,
  recipient,
}: {
  open: boolean;
  onClose: () => void;
  recipient: MessageRecipient | null;
}) {
  const [templateId, setTemplateId] = useState(
    recipient?.defaultTemplateId ?? MESSAGE_TEMPLATES[0].id
  );
  const [text, setText] = useState("");
  const [edited, setEdited] = useState(false);

  const vars: TemplateVars = useMemo(
    () => ({ name: recipient?.name, ...recipient?.vars }),
    [recipient]
  );

  // regenerate body when template or recipient changes (unless manually edited)
  useEffect(() => {
    if (!open) return;
    const id = recipient?.defaultTemplateId ?? MESSAGE_TEMPLATES[0].id;
    setTemplateId(id);
    setText(getTemplate(id)?.body(vars) ?? "");
    setEdited(false);
  }, [open, recipient, vars]);

  const onPickTemplate = (id: string) => {
    setTemplateId(id);
    setText(getTemplate(id)?.body(vars) ?? "");
    setEdited(false);
  };

  if (!recipient) return null;
  const link = buildWhatsAppLink(recipient.phone, text);
  const hasPhone = !!recipient.phone;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-emerald-500" />
          Message {recipient.name}
        </span>
      }
      description={
        hasPhone ? (
          <span className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" /> {recipient.phone}
          </span>
        ) : (
          "No phone on file — you can still compose & share manually"
        )
      }
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <a href={link ?? "#"} target="_blank" rel="noopener noreferrer">
            <Button variant="success">
              <MessageCircle className="h-4 w-4" />
              Open in WhatsApp
            </Button>
          </a>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <Label>Template</Label>
          <Select value={templateId} onChange={(e) => onPickTemplate(e.target.value)}>
            {MESSAGE_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label>Message {edited && <span className="text-xs text-muted">(edited)</span>}</Label>
          <Textarea
            rows={9}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setEdited(true);
            }}
          />
          <p className="mt-1 text-xs text-muted">{text.length} characters</p>
        </div>
        {!hasPhone && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            This contact has no phone number. WhatsApp will open with the message pre-filled so you
            can pick a recipient manually.
          </div>
        )}
      </div>
    </Dialog>
  );
}
