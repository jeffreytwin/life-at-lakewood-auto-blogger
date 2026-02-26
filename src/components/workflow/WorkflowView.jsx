import { useState } from "react";
import { LOGOS } from "../../data/logos";
import StepBar from "./StepBar";
import StepKeywords from "./StepKeywords";
import KeywordArticlePage from "./KeywordArticlePage";
import StepGenerating from "./StepGenerating";
import StepPreviewEdit from "./StepPreviewEdit";
import StepReview from "./StepReview";

export default function WorkflowView({ prop, articles: allArticles = [], onBack, dm=false, bg="#F2F1ED", viewStr="", mob=false }) {
  // Detect direct-review entry (from "Needs Attention" button)
  const directReviewMatch = viewStr.match(/__review__(.+)/);
  const directReviewArticleId = directReviewMatch ? directReviewMatch[1] : null;
  const directReviewArticle = directReviewArticleId
    ? allArticles.find(a => a.id === directReviewArticleId)
    : null;

  const [step, setStep]                 = useState(directReviewArticle ? 4 : 0);
  const [selectedKeywords, setSelectedKeywords] = useState([]);
  const [kwPageIndex, setKwPageIndex]   = useState(0);
  const [chosenArticles, setChosenArticles] = useState(directReviewArticle ? [directReviewArticle] : []);
  const [generatedContents, setGeneratedContents] = useState(null);

  const handleKeywordsNext = (kws) => {
    setSelectedKeywords(kws);
    setKwPageIndex(0);
    setChosenArticles([]);
    setStep(1);
  };

  // Called when user confirms their pick for keyword at kwPageIndex
  const handleArticleConfirm = (article, activeKw) => {
    const updated = [...chosenArticles];
    updated[kwPageIndex] = { ...article, kw: activeKw };
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

  // StepBar: during step 1 we show "Select Articles (2/N)" sub-label
  const stepBarStep = step === 1 ? 1 : step;

  return (
    <div style={{ padding: mob ? "20px 16px" : "36px 44px", maxWidth:900 }}>
      {/* Back button + property label */}
      <div style={{ display:"flex", alignItems:"center", gap: mob ? 8 : 12, marginBottom: mob ? 20 : 28, flexWrap:"wrap" }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", background:"#fff", border:"1px solid #E5E7EB", borderRadius:8, fontSize:12, fontWeight:700, color:"#6B7280", cursor:"pointer" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          Back to {prop.short}
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8, marginLeft:"auto" }}>
          <img src={LOGOS[prop.id]} alt={prop.name} style={{ width:22, height:22, borderRadius:"50%", objectFit:"cover" }} />
          <span style={{ fontSize:13, fontWeight:700, color:prop.color }}>{prop.name}</span>
        </div>
      </div>

      {!mob && <StepBar step={stepBarStep} prop={prop} kwIndex={kwPageIndex} totalKws={selectedKeywords.length} mob={mob} />}

      {step === 0 && <StepKeywords prop={prop} onNext={handleKeywordsNext} />}

      {step === 1 && selectedKeywords.length > 0 && (
        <KeywordArticlePage
          key={kwPageIndex}
          keyword={selectedKeywords[kwPageIndex]}
          location={prop.short}
          prop={prop}
          kwIndex={kwPageIndex}
          totalKws={selectedKeywords.length}
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

      {step === 2 && <StepGenerating prop={prop} count={chosenArticles.length} articles={chosenArticles} onDone={(contents) => { setGeneratedContents(contents); setStep(3); }} />}
      {step === 3 && <StepPreviewEdit prop={prop} articles={chosenArticles} initialContents={generatedContents} onApprove={() => setStep(4)} onBack={() => { setGeneratedContents(null); setStep(2); }} />}
      {step === 4 && <StepReview prop={prop} articles={chosenArticles} allArticles={allArticles} onDone={onBack} onGenerateMore={() => { setStep(0); setSelectedKeywords([]); setKwPageIndex(0); }} />}
    </div>
  );
}
