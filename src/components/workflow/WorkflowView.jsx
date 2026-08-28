import { useState, useEffect, useCallback } from "react";
import { LOGOS } from "../../data/logos";
import StepBar from "./StepBar";
import StepKeywords from "./StepKeywords";
import KeywordArticlePage from "./KeywordArticlePage";
import StepGenerating from "./StepGenerating";
import StepPreviewEdit from "./StepPreviewEdit";
import StepReview from "./StepReview";

// Persist workflow state to localStorage so users can resume after refresh
const STORAGE_KEY_PREFIX = "lal_workflow_";

function loadWorkflowState(propId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + propId);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    // Only restore if the saved state has meaningful progress (step >= 3 with generated content)
    if (saved && saved.step >= 3 && saved.generatedContents && saved.chosenArticles?.length > 0) {
      return saved;
    }
  } catch {}
  return null;
}

// Drop base64 image previews from saved content (they can exceed the
// localStorage quota) — uploaded Wix ids/urls are kept.
function stripImageData(contents) {
  if (!contents) return contents;
  return contents.map((c) => c && ({
    ...c,
    coverImage: c.coverImage ? { ...c.coverImage, dataUrl: null } : c.coverImage,
    sections: (c.sections || []).map((s) => (s.image ? { ...s, image: { ...s.image, dataUrl: null } } : s)),
  }));
}

function saveWorkflowState(propId, state) {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + propId, JSON.stringify(state));
  } catch {
    // Quota exceeded — retry without inline image data
    try {
      localStorage.setItem(
        STORAGE_KEY_PREFIX + propId,
        JSON.stringify({ ...state, generatedContents: stripImageData(state.generatedContents) })
      );
    } catch {}
  }
}

function clearWorkflowState(propId) {
  try {
    localStorage.removeItem(STORAGE_KEY_PREFIX + propId);
  } catch {}
}

export default function WorkflowView({ prop, articles: allArticles = [], onBack, dm=false, bg="#F2F1ED", viewStr="", mob=false, writingStyle="", businessGoals="", onRefreshArticles }) {
  // What this property has already published — used to avoid cannibalizing
  // existing content and to suggest internal links
  const publishedTitles = allArticles
    .filter(a => a.p === prop.id && a.status === "published" && a.title)
    .map(a => a.title);
  // Detect direct-review entry (from "Needs Attention" button)
  const directReviewMatch = viewStr.match(/__review__(.+)/);
  const directReviewArticleId = directReviewMatch ? directReviewMatch[1] : null;
  const directReviewArticle = directReviewArticleId
    ? allArticles.find(a => a.id === directReviewArticleId)
    : null;

  // Try to restore saved workflow state (only for steps 3+ with generated content)
  const saved = !directReviewArticle ? loadWorkflowState(prop.id) : null;

  const [step, setStep]                 = useState(directReviewArticle ? 4 : (saved ? saved.step : 0));
  const [selectedKeywords, setSelectedKeywords] = useState(saved ? saved.selectedKeywords : []);
  const [kwPageIndex, setKwPageIndex]   = useState(0);
  const [chosenArticles, setChosenArticles] = useState(directReviewArticle ? [directReviewArticle] : (saved ? saved.chosenArticles : []));
  const [generatedContents, setGeneratedContents] = useState(saved ? saved.generatedContents : null);
  const [showResumeBar, setShowResumeBar] = useState(!!saved);

  // Persist workflow state when it changes (only at step 3+ with content)
  const persistState = useCallback((s, kws, arts, contents) => {
    if (s >= 3 && contents && arts.length > 0) {
      saveWorkflowState(prop.id, { step: s, selectedKeywords: kws, chosenArticles: arts, generatedContents: contents });
    }
  }, [prop.id]);

  // Save on step/content changes
  useEffect(() => {
    persistState(step, selectedKeywords, chosenArticles, generatedContents);
  }, [step, selectedKeywords, chosenArticles, generatedContents, persistState]);

  const handleKeywordsNext = (kws) => {
    setSelectedKeywords(kws);
    setKwPageIndex(0);
    setChosenArticles([]);
    setStep(1);
    setShowResumeBar(false);
  };

  // Called when user confirms their pick for keyword at kwPageIndex.
  // activeKw is a keyword object ({ kw, vol, diff, intent, position, ... }).
  const handleArticleConfirm = (article, activeKw) => {
    const updated = [...chosenArticles];
    const kwStr = typeof activeKw === "string" ? activeKw : activeKw.kw;
    const kwData = typeof activeKw === "string" ? null : activeKw;
    updated[kwPageIndex] = { ...article, kw: kwStr, kwData };
    setChosenArticles(updated);

    if (kwPageIndex < selectedKeywords.length - 1) {
      // Move to next keyword
      setKwPageIndex(kwPageIndex + 1);
    } else {
      // All keywords done → generate
      setStep(2);
    }
  };

  // Back from keyword page
  const handleArticleBack = () => {
    if (kwPageIndex === 0) {
      setStep(0);
    } else {
      setKwPageIndex(kwPageIndex - 1);
    }
  };

  const handleBackToDashboard = () => {
    clearWorkflowState(prop.id);
    onBack();
  };

  const handleGenerateMore = () => {
    clearWorkflowState(prop.id);
    setStep(0);
    setSelectedKeywords([]);
    setKwPageIndex(0);
    setChosenArticles([]);
    setGeneratedContents(null);
    setShowResumeBar(false);
  };

  const handleStartFresh = () => {
    clearWorkflowState(prop.id);
    setStep(0);
    setSelectedKeywords([]);
    setKwPageIndex(0);
    setChosenArticles([]);
    setGeneratedContents(null);
    setShowResumeBar(false);
  };

  // StepBar: during step 1 we show "Select Articles (2/N)" sub-label
  const stepBarStep = step === 1 ? 1 : step;

  return (
    <div style={{ padding: mob ? "20px 16px" : "36px 44px", maxWidth:900 }}>
      {/* Resume bar — shown when workflow was restored from localStorage */}
      {showResumeBar && step >= 3 && (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 16px", background:"#FFFBEB", border:"1px solid #FDE68A", borderRadius:10, marginBottom:16 }}>
          <div style={{ fontSize:12, fontWeight:700, color:"#92400E" }}>
            Resumed your previous session ({chosenArticles.length} article{chosenArticles.length>1?"s":""})
          </div>
          <button onClick={handleStartFresh} style={{ fontSize:11, fontWeight:700, color:"#92400E", background:"none", border:"1px solid #FDE68A", borderRadius:6, padding:"4px 10px", cursor:"pointer" }}>
            Start Fresh
          </button>
        </div>
      )}

      {/* Back button + property label */}
      <div style={{ display:"flex", alignItems:"center", gap: mob ? 8 : 12, marginBottom: mob ? 20 : 28, flexWrap:"wrap" }}>
        <button onClick={handleBackToDashboard} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#fff", border:"1px solid #E5E7EB", borderRadius:8, fontSize:12, fontWeight:700, color:"#6B7280", cursor:"pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to {prop.short}
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
          <img src={LOGOS[prop.id]} alt={prop.name} style={{ width:22, height:22, borderRadius:"50%", objectFit:"cover" }} />
          <span style={{ fontSize:13, fontWeight:700, color:prop.color }}>{prop.name}</span>
        </div>
      </div>

      {!mob && <StepBar step={stepBarStep} prop={prop} kwIndex={kwPageIndex} totalKws={selectedKeywords.length} mob={mob} />}

      {step === 0 && <StepKeywords prop={prop} onNext={handleKeywordsNext} businessGoals={businessGoals} />}

      {step === 1 && selectedKeywords.length > 0 && (
        <KeywordArticlePage
          key={kwPageIndex}
          keyword={selectedKeywords[kwPageIndex]}
          location={prop.short}
          prop={prop}
          kwIndex={kwPageIndex}
          totalKws={selectedKeywords.length}
          businessGoals={businessGoals}
          publishedTitles={publishedTitles}
          onConfirm={handleArticleConfirm}
          onBack={handleArticleBack}
          onSkip={() => {
            // Skip = advance without choosing an article for this keyword
            if (kwPageIndex < selectedKeywords.length - 1) {
              setKwPageIndex(kwPageIndex + 1);
            } else {
              // All done (some skipped) — only generate if at least 1 article was chosen
              const chosen = chosenArticles.filter(Boolean);
              if (chosen.length > 0) { setChosenArticles(chosen); setStep(2); }
              else { setStep(0); } // all skipped, go back
            }
          }}
          existingChoice={chosenArticles[kwPageIndex] || null}
        />
      )}

      {step === 2 && <StepGenerating prop={prop} count={chosenArticles.length} articles={chosenArticles} writingStyle={writingStyle} businessGoals={businessGoals} publishedTitles={publishedTitles} onDone={(contents) => { setGeneratedContents(contents); setStep(3); }} onCancel={() => setStep(0)} />}
      {step === 3 && <StepPreviewEdit prop={prop} articles={chosenArticles} initialContents={generatedContents} writingStyle={writingStyle} onApprove={(contents) => { setGeneratedContents(contents); setStep(4); if (onRefreshArticles) onRefreshArticles(); }} onBack={() => { setGeneratedContents(null); setStep(2); }} />}
      {step === 4 && <StepReview prop={prop} articles={chosenArticles} generatedContents={generatedContents} allArticles={allArticles} onDone={handleBackToDashboard} onGenerateMore={handleGenerateMore} />}
    </div>
  );
}
