import React from "react";
import type { CustomNodeProps } from ".";
import { NODE_DIMENSIONS } from "../../../../../constants/graph";
import type { NodeData } from "../../../../../types/graph";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";

type RowProps = {
  row: NodeData["text"][number];
  x: number;
  y: number;
  index: number;
};

const Row = ({ row, x, y, index }: RowProps) => {
  const rowPosition = index * NODE_DIMENSIONS.ROW_HEIGHT;

  const getRowText = () => {
    if (row.type === "object") return `{${row.childrenCount ?? 0} keys}`;
    if (row.type === "array") return `[${row.childrenCount ?? 0} items]`;
    return row.value;
  };

  return (
    <Styled.StyledRow
      $value={row.value}
      data-key={`${row.key}: ${row.value}`}
      data-x={x}
      data-y={y + rowPosition}
    >
      <Styled.StyledKey $type="object">{row.key}: </Styled.StyledKey>
      <TextRenderer>{getRowText()}</TextRenderer>
    </Styled.StyledRow>
  );
};

const Node = ({ node, x, y }: CustomNodeProps) => (
  <Styled.StyledForeignObject
    data-id={`node-${node.id}`}
    width={node.width}
    height={node.height}
    x={0}
    y={0}
    $isObject
  >
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {(() => {
        const firstRow = node.text?.[0];
        const firstPrimitiveValue = typeof firstRow?.value === "string" || typeof firstRow?.value === "number" ? String(firstRow?.value) : undefined;
        const shouldShowLabel = Boolean(node.name && node.name !== firstPrimitiveValue);
        return shouldShowLabel ? (
          <div style={{ position: "absolute", top: 2, left: 6, fontSize: 10, fontWeight: 700, pointerEvents: "none" }}>
            {node.name}
          </div>
        ) : null;
      })()}

      <div style={{ paddingTop: (() => {
        const firstRow = node.text?.[0];
        const firstPrimitiveValue = typeof firstRow?.value === "string" || typeof firstRow?.value === "number" ? String(firstRow?.value) : undefined;
        const shouldShowLabel = Boolean(node.name && node.name !== firstPrimitiveValue);
        return shouldShowLabel ? 16 : 0;
      })() }}>
        {node.text.map((row, index) => (
          <Row key={`${node.id}-${index}`} row={row} x={x} y={y} index={index} />
        ))}
      </div>
    </div>
  </Styled.StyledForeignObject>
);

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return (
    JSON.stringify(prev.node.text) === JSON.stringify(next.node.text) &&
    prev.node.width === next.node.width &&
    prev.node.name === next.node.name &&
    prev.node.color === next.node.color
  );
}

export const ObjectNode = React.memo(Node, propsAreEqual);
