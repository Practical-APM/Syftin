"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FieldHint, FieldLabel, Input } from "@/components/ui/input";
import type { SchemaFieldRow } from "@/lib/schema/fields-editor";

export function SchemaFieldsEditor({
  fields,
  onChange,
  label = "Fields to collect",
}: {
  fields: SchemaFieldRow[];
  onChange: (fields: SchemaFieldRow[]) => void;
  label?: string;
}) {
  function updateRow(index: number, patch: Partial<SchemaFieldRow>) {
    onChange(fields.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function addRow() {
    onChange([...fields, { key: "", example: "" }]);
  }

  function removeRow(index: number) {
    onChange(fields.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <div>
        <FieldLabel>{label}</FieldLabel>
        <FieldHint>
          Add each column you want in your download — no JSON syntax needed.
        </FieldHint>
      </div>
      <div className="space-y-2">
        {fields.map((row, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder="Field name (e.g. product_name)"
              value={row.key}
              onChange={(e) => updateRow(index, { key: e.target.value })}
              className="flex-1"
            />
            <Input
              placeholder="Example value"
              value={row.example}
              onChange={(e) => updateRow(index, { example: e.target.value })}
              className="flex-[1.2]"
            />
            <button
              type="button"
              onClick={() => removeRow(index)}
              disabled={fields.length <= 1}
              className="rounded-md p-2 text-graphite-500 hover:bg-graphite-800 hover:text-red-400 disabled:opacity-30"
              aria-label="Remove field"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-3.5 w-3.5" />
        Add field
      </Button>
    </div>
  );
}

export function SchemaFieldChips({ schema }: { schema: Record<string, unknown> }) {
  const keys = Object.keys(schema).filter(
    (k) => k !== "_syftin" && !k.startsWith("_"),
  );
  if (!keys.length) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {keys.map((key) => (
        <span
          key={key}
          className="rounded-md border border-graphite-700 bg-graphite-900 px-2 py-0.5 font-mono text-[11px] text-graphite-300"
        >
          {key}
        </span>
      ))}
    </div>
  );
}
