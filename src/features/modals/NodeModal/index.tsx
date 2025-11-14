import React from "react";
import type { ModalProps } from "@mantine/core";
import { Modal, Stack, Text, ScrollArea, Flex, CloseButton, Button, Group, TextInput, Box } from "@mantine/core";
import { ColorInput } from "@mantine/core";
import { CodeHighlight } from "@mantine/code-highlight";
import type { NodeData } from "../../../types/graph";
import useGraph from "../../editor/views/GraphView/stores/useGraph";
import useJson from "../../../store/useJson";
import useFile from "../../../store/useFile";
import { useState, useEffect } from "react";
import { useRef } from "react";

// return object from json removing array and object fields
const normalizeNodeData = (nodeRows: NodeData["text"]) => {
  if (!nodeRows || nodeRows.length === 0) return "{}";
  if (nodeRows.length === 1 && !nodeRows[0].key) return `${nodeRows[0].value}`;

  const obj = {};
  nodeRows?.forEach(row => {
    if (row.type !== "array" && row.type !== "object") {
      if (row.key) obj[row.key] = row.value;
    }
  });
  return JSON.stringify(obj, null, 2);
};

// return json path in the format $["customer"]
const jsonPathToString = (path?: NodeData["path"]) => {
  if (!path || path.length === 0) return "$";
  const segments = path.map(seg => (typeof seg === "number" ? seg : `"${seg}"`));
  return `$[${segments.join("][")}]`;
};

export const NodeModal = ({ opened, onClose }: ModalProps) => {
  const nodeData = useGraph(state => state.selectedNode);
  const updateNode = useGraph(state => state.updateNode);
  const setSelectedNode = useGraph(state => state.setSelectedNode);

  const [editMode, setEditMode] = useState(false);
  const [localName, setLocalName] = useState<string>("");
  const [localColor, setLocalColor] = useState<string>("#3B82F6");
  const origNameRef = useRef<string | null>(null);
  const origColorRef = useRef<string | null>(null);

  useEffect(() => {
    if (!nodeData) return;
    // prefer an explicit name, then if the node has a key+primitive value prefer the value (e.g. name: "Apple" -> "Apple"),
    // otherwise fall back to the key, then parentKey, then first primitive value
    const firstRow = nodeData.text?.[0];
    const firstPrimitiveValue = typeof firstRow?.value === "string" || typeof firstRow?.value === "number" ? String(firstRow?.value) : undefined;

    const inferredName =
      nodeData.name ??
      (firstRow && firstRow.key && firstPrimitiveValue ? firstPrimitiveValue : undefined) ??
      firstRow?.key ??
      nodeData.parentKey ??
      firstPrimitiveValue ??
      "";

    // infer actual color from the node's text row if present, or use nodeData.color, then fallback
    const colorHexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    const colorRow = nodeData.text?.find(r => r.key === "color" || (typeof r.value === "string" && colorHexRegex.test(r.value as string)));
    const inferredColor = (typeof colorRow?.value === "string" && colorHexRegex.test(colorRow.value)) ? colorRow.value : (nodeData.color ?? "#3B82F6");

    setLocalName(inferredName ?? "");
    setLocalColor(inferredColor);
    origNameRef.current = inferredName ?? "";
    origColorRef.current = inferredColor;
  }, [nodeData]);

  return (
    <Modal size="auto" opened={opened} onClose={onClose} centered withCloseButton={false}>
      <Stack pb="sm" gap="sm">
        <Stack gap="xs">
          <Flex justify="space-between" align="center">
            <div>
              <Text fz="xs" fw={500}>
                Content
              </Text>
              <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
                <Text fz="xs" color="dimmed">
                  Name
                </Text>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 14, height: 14, borderRadius: 3, background: localColor || "#3B82F6" }} />
                  <Text fz="xs">{localName || "-"}</Text>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {editMode ? (
                <>
                  <Button
                    size="xs"
                    color="red"
                    onClick={() => {
                      // discard local changes
                      if (nodeData) {
                        const firstRow = nodeData.text?.[0];
                        const firstPrimitiveValue = typeof firstRow?.value === "string" || typeof firstRow?.value === "number" ? String(firstRow?.value) : undefined;
                        const inferredName =
                          nodeData.name ??
                          (firstRow && firstRow.key && firstPrimitiveValue ? firstPrimitiveValue : undefined) ??
                          firstRow?.key ??
                          nodeData.parentKey ??
                          firstPrimitiveValue ??
                          "";
                        setLocalName(inferredName ?? "");
                        setLocalColor(nodeData.color ?? "#3B82F6");
                      }
                      setEditMode(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="xs"
                    color="green"
                    onClick={() => {
                      if (!nodeData) return;

                      // determine keys used for name/color inside the node text (if any)
                      const firstRow = nodeData.text?.[0];
                      const firstPrimitiveValue = typeof firstRow?.value === "string" || typeof firstRow?.value === "number" ? String(firstRow?.value) : undefined;
                      const nameKey = firstRow && firstRow.key && firstPrimitiveValue ? firstRow.key : undefined;

                      // detect color row key if present (either key named 'color' or a value that looks like a hex color)
                      const colorHexRegex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
                      const colorRow = nodeData.text?.find(r => r.key === "color" || (typeof r.value === "string" && colorHexRegex.test(r.value as string)));
                      const colorKey = colorRow?.key;

                      // determine whether the user actually changed name/color
                      const changedName = localName !== (origNameRef.current ?? "");
                      const changedColor = localColor !== (origColorRef.current ?? "");

                      // prepare updated text rows: replace value for nameKey and colorKey only if changed
                      const updatedText = nodeData.text?.map(r => {
                        if (changedName && nameKey && r.key === nameKey) {
                          return { ...r, value: localName } as typeof r;
                        }
                        if (changedColor && colorKey && r.key === colorKey) {
                          return { ...r, value: localColor } as typeof r;
                        }
                        return r;
                      });

                      // If we can update underlying JSON, prefer to update the source so changes persist
                      try {
                        const raw = useJson.getState().getJson?.() ?? useJson.getState().json;
                        const parsed = JSON.parse(raw);

                        const target = (nodeData.path && nodeData.path.length > 0)
                          ? (nodeData.path as any[]).reduce((acc, seg) => acc?.[seg], parsed)
                          : parsed;

                        if (target && typeof target === "object") {
                          // apply replacements to the actual object
                          let jsonUpdated = false;

                          if (nameKey && changedName) {
                            // set primitive type based on original row.type if available
                            const originalRow = nodeData.text?.find(r => r.key === nameKey);
                            if (originalRow) {
                              if (originalRow.type === "number") target[nameKey] = Number(localName);
                              else if (originalRow.type === "boolean") target[nameKey] = localName === "true";
                              else if (localName === "null") target[nameKey] = null;
                              else target[nameKey] = localName;
                            } else {
                              target[nameKey] = localName;
                            }
                            jsonUpdated = true;
                          }

                          if (colorKey && changedColor) {
                            target[colorKey] = localColor;
                            jsonUpdated = true;
                          }

                          if (jsonUpdated) {
                            const newJson = JSON.stringify(parsed, null, 2);
                            // Update via useFile so the left editor (TextEditor) also reflects the change
                            useFile.getState().setContents({ contents: newJson, hasChanges: true });
                          }

                          // after re-parsing the graph, try to re-select the same node by path
                          try {
                            const newNodes = useGraph.getState().nodes;
                            const match = newNodes.find(n => JSON.stringify(n.path) === JSON.stringify(nodeData.path));
                            if (match) setSelectedNode(match);
                          } catch (e) {
                            // ignore
                          }
                          } else {
                          // fallback: update in-memory node only
                          const patch: Partial<typeof nodeData> = {
                            ...(changedName ? { name: localName } : {}),
                            ...(changedColor ? { color: localColor } : {}),
                            ...(updatedText ? { text: updatedText } : {}),
                          };
                          updateNode(nodeData.id, patch as any);
                          setSelectedNode({ ...(nodeData as any), ...patch } as any);
                        }
                      } catch (e) {
                        // parsing or update failed — fall back to in-memory update
                        const patch: Partial<typeof nodeData> = {
                          ...(changedName ? { name: localName } : {}),
                          ...(changedColor ? { color: localColor } : {}),
                          ...(updatedText ? { text: updatedText } : {}),
                        };
                        updateNode(nodeData.id, patch as any);
                        setSelectedNode({ ...(nodeData as any), ...patch } as any);
                      }

                      setEditMode(false);
                    }}
                  >
                    Save
                  </Button>
                </>
              ) : (
                <Button size="xs" onClick={() => setEditMode(true)}>
                  Edit
                </Button>
              )}
              <CloseButton
                onClick={() => {
                  // reset edit state when closing the modal
                  if (nodeData) {
                    const firstRow = nodeData.text?.[0];
                    const firstPrimitiveValue = typeof firstRow?.value === "string" || typeof firstRow?.value === "number" ? String(firstRow?.value) : undefined;
                    const inferredName =
                      nodeData.name ??
                      (firstRow && firstRow.key && firstPrimitiveValue ? firstPrimitiveValue : undefined) ??
                      firstRow?.key ??
                      nodeData.parentKey ??
                      firstPrimitiveValue ??
                      "";
                    setLocalName(inferredName ?? "");
                    setLocalColor(nodeData.color ?? "#3B82F6");
                  }
                  setEditMode(false);
                  onClose?.();
                }}
              />
            </div>
          </Flex>
          <ScrollArea.Autosize mah={250} maw={600}>
            {editMode ? (
              <Stack>
                <TextInput value={localName} onChange={e => setLocalName(e.currentTarget.value)} label="Name" size="xs" />
                <ColorInput value={localColor} onChange={setLocalColor} label="Color" size="xs" />
              </Stack>
            ) : (
              <CodeHighlight
                code={normalizeNodeData(nodeData?.text ?? [])}
                miw={350}
                maw={600}
                language="json"
                withCopyButton
              />
            )}
          </ScrollArea.Autosize>
        </Stack>
        <Text fz="xs" fw={500}>
          JSON Path
        </Text>
        <ScrollArea.Autosize maw={600}>
          <CodeHighlight
            code={jsonPathToString(nodeData?.path)}
            miw={350}
            mah={250}
            language="json"
            copyLabel="Copy to clipboard"
            copiedLabel="Copied to clipboard"
            withCopyButton
          />
        </ScrollArea.Autosize>
      </Stack>
    </Modal>
  );
};
