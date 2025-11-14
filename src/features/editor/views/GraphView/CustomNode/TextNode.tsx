import React from "react";
import styled from "styled-components";
import type { CustomNodeProps } from ".";
import useConfig from "../../../../../store/useConfig";
import { isContentImage } from "../lib/utils/calculateNodeSize";
import { TextRenderer } from "./TextRenderer";
import * as Styled from "./styles";

const StyledTextNodeWrapper = styled.span<{ $isParent: boolean }>`
  display: flex;
  justify-content: ${({ $isParent }) => ($isParent ? "center" : "flex-start")};
  align-items: center;
  height: 100%;
  width: 100%;
  overflow: hidden;
  padding: 0 10px;
`;

const StyledImageWrapper = styled.div`
  padding: 5px;
`;

const StyledImage = styled.img`
  border-radius: 2px;
  object-fit: contain;
  background: ${({ theme }) => theme.BACKGROUND_MODIFIER_ACCENT};
`;

const Node = ({ node, x, y }: CustomNodeProps) => {
  const { text, width, height } = node;
  const imagePreviewEnabled = useConfig(state => state.imagePreviewEnabled);
  const isImage = imagePreviewEnabled && isContentImage(JSON.stringify(text[0].value));
  const value = text[0].value;

  const firstPrimitiveValue = typeof text[0]?.value === "string" || typeof text[0]?.value === "number" ? String(text[0]?.value) : undefined;
  const shouldShowLabel = Boolean(node.name && node.name !== firstPrimitiveValue);

  return (
    <Styled.StyledForeignObject
      data-id={`node-${node.id}`}
      width={width}
      height={height}
      x={0}
      y={0}
    >
      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {shouldShowLabel ? (
          <div style={{ position: "absolute", top: 2, left: 6, fontSize: 10, fontWeight: 700, pointerEvents: "none" }}>
            {node.name}
          </div>
        ) : null}

        {isImage ? (
          <StyledImageWrapper style={{ paddingTop: shouldShowLabel ? 16 : 0 }}>
            <StyledImage src={JSON.stringify(text[0].value)} width="70" height="70" loading="lazy" />
          </StyledImageWrapper>
        ) : (
          <StyledTextNodeWrapper
            data-x={x}
            data-y={y}
            data-key={JSON.stringify(text)}
            $isParent={false}
            style={{ paddingTop: shouldShowLabel ? 16 : 0 }}
          >
            <Styled.StyledKey $value={value} $type={typeof text[0].value}>
              <TextRenderer>{value}</TextRenderer>
            </Styled.StyledKey>
          </StyledTextNodeWrapper>
        )}
      </div>
    </Styled.StyledForeignObject>
  );
};

function propsAreEqual(prev: CustomNodeProps, next: CustomNodeProps) {
  return (
    prev.node.text === next.node.text &&
    prev.node.width === next.node.width &&
    prev.node.name === next.node.name &&
    prev.node.color === next.node.color
  );
}

export const TextNode = React.memo(Node, propsAreEqual);
