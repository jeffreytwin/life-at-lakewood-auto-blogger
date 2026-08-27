const STAGE_STYLE = {
  Awareness:     { bg: "#EFF6FF", tx: "#1D4ED8" },
  Consideration: { bg: "#FEF3C7", tx: "#92400E" },
  Decision:      { bg: "#F0FDF4", tx: "#15803D" },
};

export default function SuggestionCard({ s, isSelected, onSelect, prop }) {
  const stage = STAGE_STYLE[s.funnelStage];
  return (
    <div
      onClick={onSelect}
      style={{
        background: "#fff",
        border: `2px solid ${isSelected ? prop.color : "#E5E7EB"}`,
        borderRadius: 14,
        padding: "20px 22px",
        cursor: "pointer",
        transition: "all 0.15s",
        boxShadow: isSelected ? `0 0 0 4px ${prop.light}` : "none",
        position: "relative",
      }}
    >
      {/* Selected indicator */}
      <div style={{
        position: "absolute", top: 16, right: 16,
        width: 22, height: 22, borderRadius: "50%",
        border: `2px solid ${isSelected ? prop.color : "#D1D5DB"}`,
        background: isSelected ? prop.color : "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.15s",
      }}>
        {isSelected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
      </div>

      <div style={{ paddingRight: 36 }}>
        <div style={{ fontFamily:"'DM Sans',sans-serif", fontSize: 15, fontWeight: 700, color: "#111827", lineHeight: 1.35, marginBottom: 8 }}>
          {s.title}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {stage && (
            <span title="Buyer funnel stage this article targets" style={{ fontSize: 11, fontWeight: 700, color: stage.tx, background: stage.bg, padding: "2px 10px", borderRadius: 20 }}>
              {s.funnelStage}
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 700, color: "#6B7280", background: "#F3F4F6", padding: "2px 10px", borderRadius: 20 }}>
            {s.angle}
          </span>
        </div>
        <p style={{ fontSize: 12, color: "#6B7280", margin: 0, lineHeight: 1.6 }}>{s.why}</p>
        {s.cta && (
          <div style={{ fontSize: 11.5, color: "#374151", marginTop: 8, display: "flex", gap: 6, alignItems: "baseline" }}>
            <span style={{ fontWeight: 800, color: prop.accent, flexShrink: 0 }}>CTA →</span>
            <span>{s.cta}</span>
          </div>
        )}
      </div>
    </div>
  );
}
