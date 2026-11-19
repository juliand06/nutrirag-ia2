import React from 'react';

export function renderFormattedText(rawText) {
  if (!rawText) return null;
  const lines = String(rawText).split('\n');
  return lines.map((line, lineIdx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      return <div key={lineIdx} style={{ height: '8px' }} />;
    }
    const isHeading = /^#{1,4}\s+/.test(trimmed);
    const isBullet = /^[-*•]\s+/.test(trimmed);
    const cleanLine = isHeading
      ? trimmed.replace(/^#{1,4}\s+/, '')
      : isBullet
        ? trimmed.replace(/^[-*•]\s+/, '')
        : line;

    const parts = cleanLine.split(/(\*\*[^*]+\*\*)/g);
    const renderedParts = parts.map((part, pIdx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={pIdx}>{part.slice(2, -2)}</strong>;
      }
      return <span key={pIdx}>{part}</span>;
    });

    if (isHeading) {
      return (
        <div
          key={lineIdx}
          style={{
            fontWeight: 600,
            fontSize: '0.94rem',
            marginTop: lineIdx > 0 ? '10px' : 0,
            marginBottom: '4px'
          }}
        >
          {renderedParts}
        </div>
      );
    }

    if (isBullet) {
      return (
        <div
          key={lineIdx}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            paddingLeft: '4px',
            marginTop: '4px'
          }}
        >
          <span style={{ color: 'var(--accent)', fontWeight: 700 }} aria-hidden="true">
            •
          </span>
          <span>{renderedParts}</span>
        </div>
      );
    }

    return (
      <div key={lineIdx} style={{ marginTop: lineIdx > 0 ? '4px' : 0 }}>
        {renderedParts}
      </div>
    );
  });
}

export default function FormattedText({ text }) {
  return <>{renderFormattedText(text)}</>;
}
