import { useState, useRef } from "react";
import useMobile from "../../hooks/useMobile";
import { requestRevision, uploadWixMedia, createWixDraft } from "../../services/api";

// Resize + compress an image file in the browser so uploads stay small
// (Wix hosts the final file; ~1600px wide JPEG is plenty for a blog).
function compressImage(file, maxW = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the image file"));
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Not a valid image file"));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        // PNGs with transparency stay PNG; photos become JPEG
        const isPng = file.type === "image/png";
        const dataUrl = isPng ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", quality);
        resolve({ dataUrl, width: w, height: h });
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function slugifyFileName(title, suffix) {
  const base = (title || "image").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  return `${base}-${suffix}.jpg`;
}

// Small image attachment editor used for both cover and section images
function ImageSlot({ image, onSet, onUpdate, onRemove, label, accent, compact = false }) {
  const inputRef = useRef(null);
  const [err, setErr] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setErr("");
    try {
      const { dataUrl, width, height } = await compressImage(file);
      onSet({ dataUrl, width, height, alt: "", caption: "", wixId: null, url: null });
    } catch (ex) {
      setErr(ex.message);
    }
  };

  if (!image) {
    return (
      <div>
        <button onClick={() => inputRef.current?.click()}
          style={{ display:"inline-flex", alignItems:"center", gap:6, padding: compact ? "5px 12px" : "8px 16px", background:"#F9FAFB", border:"1.5px dashed #D1D5DB", borderRadius:8, fontSize:11.5, fontWeight:700, color:"#6B7280", cursor:"pointer" }}>
          🖼️ {label}
        </button>
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
        {err && <div style={{ fontSize:11, color:"#DC2626", marginTop:4 }}>{err}</div>}
      </div>
    );
  }

  return (
    <div style={{ display:"flex", gap:12, padding:"10px", background:"#F9FAFB", borderRadius:10, border:"1px solid #E5E7EB", alignItems:"flex-start" }}>
      <img src={image.url || image.dataUrl} alt={image.alt || ""} style={{ width:110, height:74, objectFit:"cover", borderRadius:8, flexShrink:0, background:"#E5E7EB" }} />
      <div style={{ flex:1, display:"flex", flexDirection:"column", gap:6 }}>
        <input
          value={image.alt || ""}
          onChange={(e) => onUpdate({ ...image, alt: e.target.value })}
          placeholder="Alt text (describe the image for SEO & accessibility)"
          style={{ width:"100%", padding:"6px 10px", border:"1px solid #E5E7EB", borderRadius:7, fontSize:12, color:"#111827", outline:"none", background:"#fff" }}
        />
        <input
          value={image.caption || ""}
          onChange={(e) => onUpdate({ ...image, caption: e.target.value })}
          placeholder="Caption (optional, shown under the image)"
          style={{ width:"100%", padding:"6px 10px", border:"1px solid #E5E7EB", borderRadius:7, fontSize:12, color:"#111827", outline:"none", background:"#fff" }}
        />
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {image.wixId
            ? <span style={{ fontSize:10, fontWeight:700, color:"#15803D", background:"#F0FDF4", padding:"2px 8px", borderRadius:6 }}>✓ In Wix Media Manager</span>
            : <span style={{ fontSize:10, fontWeight:700, color:"#92400E", background:"#FFFBEB", padding:"2px 8px", borderRadius:6 }}>Uploads to Wix on send</span>
          }
          <button onClick={() => inputRef.current?.click()} style={{ fontSize:10.5, fontWeight:700, color:accent, background:"none", border:"none", cursor:"pointer", padding:0 }}>Replace</button>
          <button onClick={onRemove} style={{ fontSize:10.5, fontWeight:700, color:"#DC2626", background:"none", border:"none", cursor:"pointer", padding:0 }}>Remove</button>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }} />
    </div>
  );
}

export default function StepPreviewEdit({ prop, articles, initialContents, writingStyle = "", onApprove, onBack }) {
  const mob = useMobile();
  const [activeIndex, setActiveIndex] = useState(0);
  const [articleContents, setArticleContents] = useState(() => initialContents || []);
  const [revisionInput, setRevisionInput] = useState("");
  const [revising, setRevising] = useState(false);
  const [reviseErr, setReviseErr] = useState("");
  const [revisionHistory, setRevisionHistory] = useState(() => articles.map(() => []));
  const [approvedSet, setApprovedSet] = useState(new Set());
  const [pushing, setPushing] = useState(false);
  const [pushStatus, setPushStatus] = useState("");
  // Per-article push outcome: { success: bool, error?: string }
  const [pushResults, setPushResults] = useState(() => articles.map(() => null));

  const content = articleContents[activeIndex];
  const article = articles[activeIndex];

  const handleSectionEdit = (secIdx, field, value) => {
    setArticleContents(prev => {
      const updated = [...prev];
      const c = { ...updated[activeIndex] };
      const secs = [...c.sections];
      secs[secIdx] = { ...secs[secIdx], [field]: value };
      c.sections = secs;
      updated[activeIndex] = c;
      return updated;
    });
  };

  const handleMetaEdit = (field, value) => {
    setArticleContents(prev => {
      const updated = [...prev];
      updated[activeIndex] = { ...updated[activeIndex], [field]: value };
      return updated;
    });
  };

  const setSectionImage = (secIdx, image) => handleSectionEdit(secIdx, "image", image);
  const setCoverImage = (image) => handleMetaEdit("coverImage", image);

  const handleRequestRevision = async () => {
    if (!revisionInput.trim() || revising) return;
    setRevising(true);
    setReviseErr("");
    const req = revisionInput.trim();

    try {
      const current = articleContents[activeIndex];
      const revised = await requestRevision(current, req, prop, writingStyle);

      // Re-attach images the model never saw: match sections by heading, then by index
      const withImages = {
        ...revised,
        coverImage: current.coverImage || null,
        sections: (revised.sections || []).map((sec, idx) => {
          const byHeading = (current.sections || []).find(
            (p) => p.image && p.heading && sec.heading && p.heading.trim().toLowerCase() === sec.heading.trim().toLowerCase()
          );
          const src = byHeading || ((current.sections || [])[idx]?.image ? current.sections[idx] : null);
          return src?.image ? { ...sec, image: src.image } : sec;
        }),
      };

      setArticleContents(prev => {
        const updated = [...prev];
        updated[activeIndex] = withImages;
        return updated;
      });
      setRevisionHistory(prev => {
        const n = [...prev];
        n[activeIndex] = [...(n[activeIndex] || []), req];
        return n;
      });
      setRevisionInput("");
    } catch (e) {
      setReviseErr(e.message);
    }
    setRevising(false);
  };

  const handleApproveArticle = () => {
    setApprovedSet(prev => new Set([...prev, activeIndex]));
  };

  const allApproved = approvedSet.size === articles.length;

  // Upload one image to the Wix Media Manager if it isn't there yet.
  // Returns the updated image object (with wixId/url set).
  const ensureUploaded = async (image, fileName) => {
    if (!image || image.wixId) return image;
    const result = await uploadWixMedia({ propertyId: prop.id, fileName, dataUrl: image.dataUrl });
    if (!result.id) throw new Error("Wix did not return a media id for the uploaded image");
    return { ...image, wixId: result.id, url: result.url || null };
  };

  const handleSendToWix = async () => {
    setPushing(true);
    const results = [...pushResults];
    const contents = [...articleContents];

    for (let i = 0; i < articles.length; i++) {
      if (results[i]?.success) continue; // already pushed in a previous attempt
      const art = articles[i];
      let c = { ...contents[i] };
      try {
        // 1. Upload cover + section images to the Wix Media Manager
        const imgCount = (c.coverImage ? 1 : 0) + (c.sections || []).filter(s => s.image).length;
        let uploaded = 0;
        const tick = () => { uploaded++; setPushStatus(`Article ${i + 1}/${articles.length}: uploading image ${uploaded}/${imgCount}…`); };

        if (c.coverImage) {
          setPushStatus(`Article ${i + 1}/${articles.length}: uploading image 1/${imgCount}…`);
          c.coverImage = await ensureUploaded(c.coverImage, slugifyFileName(c.slug || art.title, "cover"));
          tick();
        }
        const secs = [...(c.sections || [])];
        for (let s = 0; s < secs.length; s++) {
          if (secs[s].image) {
            setPushStatus(`Article ${i + 1}/${articles.length}: uploading image ${uploaded + 1}/${imgCount}…`);
            secs[s] = { ...secs[s], image: await ensureUploaded(secs[s].image, slugifyFileName(c.slug || art.title, `s${s + 1}`)) };
            tick();
          }
        }
        c.sections = secs;
        contents[i] = c;
        // Persist uploaded ids immediately so a failed draft push doesn't re-upload
        setArticleContents([...contents]);

        // 2. Create the draft post with images embedded in the rich content
        setPushStatus(`Article ${i + 1}/${articles.length}: creating Wix draft…`);
        await createWixDraft({
          propertyId: prop.id,
          title: art.title,
          sections: c.sections.map(({ heading, body, image }) => ({
            heading,
            body,
            ...(image?.wixId ? { image: { wixId: image.wixId, width: image.width, height: image.height, alt: image.alt, caption: image.caption } } : {}),
          })),
          seoTitle: c.seoTitle,
          metaDescription: c.metaDescription,
          slug: c.slug,
          ...(c.coverImage?.wixId ? { coverImage: { wixId: c.coverImage.wixId } } : {}),
        });
        results[i] = { success: true };
      } catch (e) {
        results[i] = { success: false, error: e.message };
      }
      setPushResults([...results]);
    }

    setPushing(false);
    setPushStatus("");
    if (results.every(r => r?.success)) {
      onApprove(contents);
    }
  };

  const failedPushes = pushResults.filter(r => r && !r.success).length;

  if (pushing) {
    return (
      <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:350, textAlign:"center" }}>
        <div style={{ width:64, height:64, borderRadius:"50%", background:prop.light, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, marginBottom:20, animation:"pulse 2s ease-in-out infinite" }}>🚀</div>
        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:prop.accent, margin:"0 0 8px" }}>
          Pushing to Wix…
        </h2>
        <p style={{ fontSize:13, color:"#6B7280" }}>{pushStatus || `Formatting and sending ${articles.length} article${articles.length>1?"s":""} to Wix.`}</p>
        <div style={{ width:200, height:6, background:"#E5E7EB", borderRadius:3, overflow:"hidden", marginTop:20 }}>
          <div style={{ width:"70%", height:"100%", background:`linear-gradient(90deg,${prop.color},${prop.accent})`, borderRadius:3, animation:"indeterminate 1.5s ease-in-out infinite" }} />
        </div>
        <style>{`@keyframes indeterminate { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} } @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.05)} }`}</style>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Inter','DM Sans',system-ui,sans-serif", fontWeight:800, fontSize:16, color:prop.accent, margin:"0 0 6px" }}>
          Preview & Edit
        </h2>
        <p style={{ fontFamily:"'DM Sans',sans-serif", fontSize:13, color:"#6B7280", margin:0 }}>
          Review each article before sending to Wix. Add photos, edit directly, or request AI-powered revisions. Images are uploaded into the Wix Media Manager so Wix hosts them.
        </p>
      </div>

      {/* Push failure banner */}
      {failedPushes > 0 && (
        <div style={{ padding:"12px 16px", background:"#FEF2F2", border:"1px solid #FECACA", borderRadius:12, marginBottom:16 }}>
          <div style={{ fontSize:12.5, fontWeight:700, color:"#B91C1C", marginBottom:6 }}>
            {failedPushes} article{failedPushes>1?"s":""} failed to push to Wix — successfully pushed articles won't be duplicated if you retry:
          </div>
          {pushResults.map((r, i) => r && !r.success && (
            <div key={i} style={{ fontSize:11.5, color:"#B91C1C", marginBottom:2 }}>• <strong>{articles[i].title}</strong>: {r.error}</div>
          ))}
          <button onClick={handleSendToWix} style={{ marginTop:8, padding:"7px 16px", background:"#B91C1C", color:"#fff", border:"none", borderRadius:8, fontSize:11.5, fontWeight:700, cursor:"pointer" }}>
            ↻ Retry Failed
          </button>
        </div>
      )}

      {/* Article tabs */}
      {articles.length > 1 && (
        <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap" }}>
          {articles.map((a, i) => (
            <button key={i} onClick={() => setActiveIndex(i)}
              style={{
                padding:"8px 16px", borderRadius:8, fontSize:12, fontWeight:700, cursor:"pointer", border:"none",
                background: i === activeIndex ? prop.color : "#F3F4F6",
                color: i === activeIndex ? "#fff" : "#6B7280",
                position:"relative"
              }}>
              {approvedSet.has(i) && <span style={{ position:"absolute", top:-4, right:-4, fontSize:10, background:"#22C55E", color:"#fff", borderRadius:"50%", width:16, height:16, display:"flex", alignItems:"center", justifyContent:"center" }}>✓</span>}
              Article {i+1}
            </button>
          ))}
        </div>
      )}

      {/* Floating approve bar on desktop */}
      {!mob && (
        <div style={{
          position:"sticky", top:0, zIndex:50,
          background:"#fff", borderBottom:"1px solid #E5E7EB",
          padding:"10px 26px", marginBottom:16, borderRadius:"14px 14px 0 0",
          display:"flex", justifyContent:"space-between", alignItems:"center",
          boxShadow:"0 2px 8px rgba(0,0,0,0.04)"
        }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>
            {article.title.length > 60 ? article.title.slice(0, 57) + "…" : article.title}
          </div>
          {approvedSet.has(activeIndex)
            ? <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#22C55E", background:"#F0FDF4", padding:"6px 14px", borderRadius:8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Approved
              </div>
            : <button onClick={handleApproveArticle}
                style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#fff", background:"#22C55E", padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Approve Article
              </button>
          }
        </div>
      )}

      {/* Article header */}
      <div style={{ background:"#fff", border:`1px solid ${approvedSet.has(activeIndex)?prop.accent:"#E5E7EB"}`, borderRadius:14, padding:"24px 26px", marginBottom:16 }}>
        <div style={{ display:"flex", flexDirection: mob ? "column" : "row", justifyContent:"space-between", alignItems: mob ? "stretch" : "flex-start", gap: mob ? 12 : 0, marginBottom:16 }}>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, color:"#111827", marginBottom:6, lineHeight:1.3 }}>{article.title}</div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:11, fontWeight:700, color:prop.color, background:prop.light, padding:"2px 10px", borderRadius:20 }}>🎯 {article.kw}</span>
              <span style={{ fontSize:11, color:"#6B7280" }}>✍️ {content && content.sections ? content.sections.reduce((sum, sec) => sum + (sec.heading ? sec.heading.split(/\s+/).filter(Boolean).length : 0) + (sec.body ? sec.body.split(/\s+/).filter(Boolean).length : 0), 0).toLocaleString() : "—"} words</span>
              <span style={{ fontSize:11, color:"#6B7280" }}>🖼️ {(content?.coverImage ? 1 : 0) + (content?.sections || []).filter(s => s.image).length} image{((content?.coverImage ? 1 : 0) + (content?.sections || []).filter(s => s.image).length) === 1 ? "" : "s"}</span>
            </div>
          </div>
          {approvedSet.has(activeIndex)
            ? <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#22C55E", background:"#F0FDF4", padding:"6px 14px", borderRadius:8 }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Approved
              </div>
            : <button onClick={handleApproveArticle}
                style={{ display:"flex", alignItems:"center", gap:5, fontSize:12, fontWeight:700, color:"#fff", background:"#22C55E", padding:"8px 16px", borderRadius:8, border:"none", cursor:"pointer" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Approve Article
              </button>
          }
        </div>

        {/* Cover image */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:8 }}>Cover Image</div>
          <ImageSlot
            image={content.coverImage || null}
            onSet={setCoverImage}
            onUpdate={setCoverImage}
            onRemove={() => setCoverImage(null)}
            label="Add cover image"
            accent={prop.accent}
          />
        </div>

        {/* SEO Meta */}
        <div style={{ background:"#F9FAFB", borderRadius:10, padding:"14px 16px", marginBottom:16 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:10 }}>SEO Settings</div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>SEO Title</label>
            <input value={content.seoTitle} onChange={e => handleMetaEdit("seoTitle", e.target.value)}
              style={{ width:"100%", padding:"8px 12px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:16, color:"#111827", outline:"none", background:"#fff" }}
              onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
            <div style={{ fontSize:10, color:content.seoTitle.length > 60 ? "#EF4444" : "#9CA3AF", marginTop:3 }}>{content.seoTitle.length}/60 characters</div>
          </div>
          <div style={{ marginBottom:10 }}>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>Meta Description</label>
            <textarea value={content.metaDescription} onChange={e => handleMetaEdit("metaDescription", e.target.value)}
              rows={2} style={{ width:"100%", padding:"8px 12px", border:"1px solid #E5E7EB", borderRadius:8, fontSize:16, color:"#111827", outline:"none", resize:"vertical", background:"#fff", fontFamily:"inherit" }}
              onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
            <div style={{ fontSize:10, color:content.metaDescription.length > 160 ? "#EF4444" : "#9CA3AF", marginTop:3 }}>{content.metaDescription.length}/160 characters</div>
          </div>
          <div>
            <label style={{ fontSize:11, fontWeight:700, color:"#6B7280", display:"block", marginBottom:4 }}>URL Slug</label>
            <div style={{ display:"flex", alignItems:"center", gap:0, fontSize:12, color:"#9CA3AF", overflow:"hidden" }}>
              <span style={{ padding:"8px 8px 8px 12px", background:"#F3F4F6", border:"1px solid #E5E7EB", borderRight:"none", borderRadius:"8px 0 0 8px", whiteSpace:"nowrap", flexShrink:0, fontSize:11, maxWidth: mob ? 110 : "none", overflow:"hidden", textOverflow:"ellipsis" }}>{prop.blog}/</span>
              <input value={content.slug} onChange={e => handleMetaEdit("slug", e.target.value)}
                style={{ flex:1, minWidth:0, padding:"8px 10px", border:"1px solid #E5E7EB", borderRadius:"0 8px 8px 0", fontSize:16, color:"#111827", outline:"none", background:"#fff" }}
                onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor="#E5E7EB"} />
            </div>
          </div>
        </div>

        {/* Article body sections */}
        <div style={{ fontSize:10, fontWeight:700, color:"#9CA3AF", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>Article Content</div>
        {content.sections.map((sec, si) => (
          <div key={si} style={{ marginBottom:16, borderLeft:`3px solid ${prop.light}`, paddingLeft:16 }}>
            <input value={sec.heading} onChange={e => handleSectionEdit(si, "heading", e.target.value)}
              style={{ width:"100%", padding:"6px 0", border:"none", borderBottom:"1px solid #F3F4F6", fontSize:14, fontWeight:700, color:"#111827", outline:"none", background:"transparent", marginBottom:8 }}
              onFocus={e=>e.target.style.borderBottomColor=prop.accent} onBlur={e=>e.target.style.borderBottomColor="#F3F4F6"} />
            <div style={{ marginBottom:8 }}>
              <ImageSlot
                image={sec.image || null}
                onSet={(img) => setSectionImage(si, img)}
                onUpdate={(img) => setSectionImage(si, img)}
                onRemove={() => setSectionImage(si, null)}
                label="Add image to this section"
                accent={prop.accent}
                compact
              />
            </div>
            <textarea value={sec.body} onChange={e => handleSectionEdit(si, "body", e.target.value)}
              rows={Math.max(4, Math.ceil(sec.body.length / 90))}
              style={{ width:"100%", padding:"8px 0", border:"none", fontSize:13, color:"#374151", outline:"none", resize:"vertical", lineHeight:1.7, background:"transparent", fontFamily:"inherit" }} />
          </div>
        ))}

        {/* Revision request */}
        <div style={{ background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, padding:"14px 16px", marginTop:8 }}>
          <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:8 }}>
            <span style={{ fontSize:14 }}>💬</span>
            <span style={{ fontSize:12, fontWeight:700, color:"#92400E" }}>Request AI Revision</span>
          </div>
          <p style={{ fontSize:11, color:"#92400E", margin:"0 0 10px", opacity:0.8 }}>
            Describe what you'd like changed — tone, length, specific sections, added details, etc. Your images stay attached.
          </p>
          <div style={{ display:"flex", gap:8 }}>
            <textarea value={revisionInput} onChange={e => setRevisionInput(e.target.value)}
              placeholder='e.g. "Make the intro more conversational" or "Add a section about school zoning"'
              rows={2}
              style={{ flex:1, padding:"8px 12px", border:"1px solid #FDE68A", borderRadius:8, fontSize:12, color:"#111827", outline:"none", resize:"vertical", background:"#fff", fontFamily:"inherit" }}
              onFocus={e=>e.target.style.borderColor=prop.accent} onBlur={e=>e.target.style.borderColor="#FDE68A"} />
            <button onClick={handleRequestRevision} disabled={!revisionInput.trim() || revising}
              style={{ padding:"8px 18px", background:revising ? "#E5E7EB" : prop.color, color:revising ? "#9CA3AF" : "#fff", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:revising?"not-allowed":"pointer", whiteSpace:"nowrap", alignSelf:"flex-end" }}>
              {revising ? "Revising…" : "Revise ✨"}
            </button>
          </div>
          {reviseErr && (
            <div style={{ marginTop:8, fontSize:11.5, color:"#B91C1C", fontWeight:600 }}>
              ⚠ Revision failed: {reviseErr}
            </div>
          )}
          {revisionHistory[activeIndex] && revisionHistory[activeIndex].length > 0 && (
            <div style={{ marginTop:10, borderTop:"1px solid #FDE68A", paddingTop:8 }}>
              <div style={{ fontSize:10, fontWeight:700, color:"#B45309", marginBottom:4 }}>Revision History</div>
              {revisionHistory[activeIndex].map((r, ri) => (
                <div key={ri} style={{ fontSize:11, color:"#92400E", padding:"3px 0", display:"flex", gap:6 }}>
                  <span style={{ color:"#B45309", fontWeight:700 }}>#{ri+1}</span> {r}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div style={{ display:"flex", flexDirection: mob ? "column-reverse" : "row", justifyContent:"space-between", alignItems:"center", gap: mob ? 10 : 0, padding:"16px 0" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, padding:"10px 18px", background:"transparent", border:"1px solid #E5E7EB", borderRadius:10, fontSize:13, fontWeight:700, color:"#6B7280", cursor:"pointer" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Regenerate Articles
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontSize:12, color:allApproved ? "#22C55E" : "#9CA3AF", fontWeight:600 }}>
            {approvedSet.size}/{articles.length} approved
          </span>
          <button onClick={handleSendToWix} disabled={!allApproved}
            style={{ padding:"11px 28px", border:"none", borderRadius:10, fontSize:13, fontWeight:800, cursor:allApproved?"pointer":"not-allowed",
              background:allApproved?prop.color:"#E5E7EB", color:allApproved?"#fff":"#9CA3AF" }}>
            Send to Wix Drafts →
          </button>
        </div>
      </div>
    </div>
  );
}
