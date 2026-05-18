import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { type QuizQuestion, extremeWeatherQuizQuestions } from "../data/extremeWeather";

type AnswerMap = Record<string, number | null>;
const QUESTIONS_PER_SET = 3;
const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

function pickRandomQuestions(pool: QuizQuestion[], count: number): QuizQuestion[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export default function ExtremeWeatherQuizPage() {
  const navigate = useNavigate();
  const [activeQuestions, setActiveQuestions] = useState<QuizQuestion[]>(() =>
    extremeWeatherQuizQuestions.slice(0, Math.min(QUESTIONS_PER_SET, extremeWeatherQuizQuestions.length))
  );
  const createInitialAnswers = (questions: QuizQuestion[]): AnswerMap =>
    Object.fromEntries(questions.map((q) => [q.id, null]));

  const [answers, setAnswers] = useState<AnswerMap>(() => createInitialAnswers(activeQuestions));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [lockInput, setLockInput] = useState(false);
  const [wrongModalOpen, setWrongModalOpen] = useState(false);
  const [wrongPickedIndex, setWrongPickedIndex] = useState<number | null>(null);

  const current = activeQuestions[currentIndex] ?? null;
  const total = activeQuestions.length;
  const answeredCount = Object.values(answers).filter((v) => v !== null).length;
  const progress = total === 0 ? 0 : Math.round((answeredCount / total) * 100);
  const isFinished = currentIndex >= total;

  const score = useMemo(() => {
    return activeQuestions.reduce((sum, q) => {
      const answer = answers[q.id];
      if (answer === null) return sum;
      return sum + (answer === q.correctIndex ? 1 : 0);
    }, 0);
  }, [answers, activeQuestions]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const advanceToNext = () => {
    setSelectedIndex(null);
    setWrongPickedIndex(null);
    setCurrentIndex((prev) => prev + 1);
    setLockInput(false);
  };

  const handleAnswer = (optIndex: number) => {
    if (!current || lockInput || wrongModalOpen || isFinished) return;
    setLockInput(true);
    setSelectedIndex(optIndex);
    setAnswers((prev) => ({ ...prev, [current.id]: optIndex }));

    const correct = optIndex === current.correctIndex;
    if (correct) {
      window.setTimeout(() => {
        advanceToNext();
      }, 760);
      return;
    }

    setWrongPickedIndex(optIndex);
    window.setTimeout(() => {
      setWrongModalOpen(true);
    }, 420);
  };

  const closeWrongModal = () => {
    setWrongModalOpen(false);
    window.setTimeout(() => {
      advanceToNext();
    }, 180);
  };

  const restartCurrentSet = () => {
    setAnswers(createInitialAnswers(activeQuestions));
    setCurrentIndex(0);
    setSelectedIndex(null);
    setWrongPickedIndex(null);
    setWrongModalOpen(false);
    setLockInput(false);
  };

  const replaceQuestions = () => {
    const nextSet = pickRandomQuestions(extremeWeatherQuizQuestions, QUESTIONS_PER_SET);
    setActiveQuestions(nextSet);
    setAnswers(createInitialAnswers(nextSet));
    setCurrentIndex(0);
    setSelectedIndex(null);
    setWrongPickedIndex(null);
    setWrongModalOpen(false);
    setLockInput(false);
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-[linear-gradient(180deg,#122d2b_0%,#eef8f5_16%,#f7fbfa_76%,#dfeee9_100%)] text-[#10201f]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(131,197,190,0.26),transparent_44%),radial-gradient(circle_at_84%_84%,rgba(23,65,63,0.12),transparent_42%)]" />

      <header className="relative z-20 mx-auto flex h-20 w-full max-w-[1200px] items-center justify-between px-5 sm:px-8">
        <button
          type="button"
          onClick={() => navigate("/extreme-weather-risks")}
          className="inline-flex items-center gap-2 rounded-full border border-[#17413f]/25 bg-[#f5f0e8]/86 px-4 py-2 text-sm text-[#10201f] backdrop-blur transition-opacity hover:opacity-85"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#17413f]">Extreme Weather Quiz</div>
      </header>

      <div className="relative z-10 mx-auto flex h-[calc(100vh-80px)] w-full max-w-[1200px] flex-col px-5 pb-8 sm:px-8 sm:pb-10">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm text-[#17413f]">
            <span>Question {Math.min(currentIndex + 1, total)} / {total}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#17413f]/16">
            <div
              className="h-full rounded-full bg-[#84d2c3] transition-all duration-500"
              style={{ width: `${progress}%`, transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
            />
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden rounded-[28px] border border-[#17413f]/20 bg-[rgba(245,240,232,0.72)] backdrop-blur-sm">
          <AnimatePresence mode="wait">
            {!isFinished && current && (
              <motion.div
                key={current.id}
                className="absolute inset-0 flex h-full flex-col justify-between p-6 sm:p-10"
                initial={{ opacity: 0, filter: "blur(9px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                exit={{ opacity: 0, filter: "blur(8px)", y: 18, scale: 0.985 }}
                transition={{ duration: 0.75, ease: EASE }}
              >
                <motion.div
                  initial={{ y: -80, opacity: 0, filter: "blur(10px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  transition={{ duration: 0.82, ease: EASE }}
                  className="pt-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#4a5c3a]">Question {currentIndex + 1}</p>
                  <h2 className="mt-3 text-2xl font-bold leading-snug text-[#10201f] sm:text-4xl">{current.prompt}</h2>
                </motion.div>

                <motion.div
                  className="grid gap-3 pb-2"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: {
                      transition: {
                        staggerChildren: 0.1,
                        delayChildren: 0.18,
                      },
                    },
                  }}
                >
                  {current.options.map((opt, optIndex) => {
                    const isSelected = selectedIndex === optIndex;
                    const isCorrectChoice = isSelected && optIndex === current.correctIndex;
                    const isWrongChoice = isSelected && wrongPickedIndex === optIndex;
                    return (
                      <motion.button
                        key={opt}
                        type="button"
                        disabled={lockInput || wrongModalOpen}
                        onClick={() => handleAnswer(optIndex)}
                        variants={{
                          hidden: { y: 60, opacity: 0, filter: "blur(7px)" },
                          show: { y: 0, opacity: 1, filter: "blur(0px)", transition: { duration: 0.72, ease: EASE } },
                        }}
                        whileHover={{ scale: 1.015, boxShadow: "0 0 0 1px rgba(132,210,195,0.55), 0 14px 28px rgba(12,40,37,0.32)" }}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition-all sm:px-5 sm:py-4 sm:text-base ${
                          isCorrectChoice
                            ? "border-emerald-300 bg-emerald-300/20"
                            : isWrongChoice
                              ? "border-red-300 bg-red-300/20"
                              : "border-[#17413f]/18 bg-white/75 text-[#10201f] hover:bg-white/92"
                        }`}
                        style={{ transitionTimingFunction: "cubic-bezier(0.22, 1, 0.36, 1)" }}
                      >
                        {opt}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </motion.div>
            )}

            {isFinished && (
              <motion.div
                key="summary"
                className="absolute inset-0 flex h-full flex-col justify-center bg-[linear-gradient(180deg,rgba(245,240,232,0.96),rgba(237,248,245,0.94))] p-6 sm:p-10"
                initial={{ opacity: 0, y: 22, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.78, ease: EASE }}
              >
                <h2 className="text-3xl font-bold text-[#10201f] sm:text-4xl">Quiz Summary</h2>
                <p className="mt-3 text-lg text-[#17413f]">You scored {score} out of {total}.</p>
                <p className="mt-2 text-sm text-[#365c58] sm:text-base">
                  {score === total
                    ? "Great work. You are ready to apply these safety steps outdoors."
                    : "Good progress. Review the feedback and try again for a perfect score."}
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={restartCurrentSet}
                    className="rounded-full border border-[#17413f]/24 bg-[#17413f] px-5 py-2.5 text-sm font-semibold text-[#f3fbf9] transition-opacity hover:opacity-90"
                  >
                    Try Again
                  </button>
                  <button
                    type="button"
                    onClick={replaceQuestions}
                    className="rounded-full border border-[#e2b063]/42 bg-[#f5e8cf] px-5 py-2.5 text-sm font-semibold text-[#6d4617] transition-opacity hover:opacity-90"
                  >
                    Replace Questions
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {wrongModalOpen && current && (
          <>
            <motion.div
              className="absolute inset-0 z-30 bg-[rgba(255,0,0,0.08)] backdrop-blur-[1.5px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: EASE }}
            />
            <motion.div
              className="absolute inset-0 z-40 flex items-center justify-center px-5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: EASE }}
            >
              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 16, filter: "blur(8px)" }}
                animate={{ scale: 1, opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ scale: 0.96, opacity: 0, y: 8, filter: "blur(6px)" }}
                transition={{ duration: 0.62, ease: EASE }}
                className="w-full max-w-xl rounded-3xl border border-white/20 bg-[#132927]/94 p-6 text-white shadow-[0_30px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-7"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.88, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.42, ease: EASE }}
                  className="text-center"
                >
                  <div className="mx-auto mb-3 inline-flex items-center justify-center rounded-full border border-red-300/40 bg-red-500/16 p-2">
                    <XCircle className="h-6 w-6 text-red-300" />
                  </div>
                  <h3 className="text-4xl font-extrabold tracking-tight text-red-300 sm:text-5xl">
                    Oops!
                  </h3>
                  <p className="mt-1 text-base font-bold text-red-200">Incorrect Answer</p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{ duration: 0.5, ease: EASE, delay: 0.2 }}
                  className="mt-5 rounded-2xl border border-white/16 bg-white/8 px-4 py-4 text-center"
                >
                  <p className="text-sm leading-relaxed text-[#e2f0ed]">
                    Your choice doesn’t match the safest response for this scenario.
                    The correct answer is{" "}
                    <span className="font-semibold text-[#bff1df]">{current.options[current.correctIndex]}</span>.
                    {` ${current.explanation}`}
                  </p>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 14, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.46, ease: EASE, delay: 0.42 }}
                  className="mt-6 flex justify-center"
                >
                  <motion.button
                    type="button"
                    onClick={closeWrongModal}
                    whileHover={{ scale: 1.04, y: -1 }}
                    whileTap={{ scale: 0.98 }}
                    className="inline-flex items-center gap-2 rounded-full border border-[#84d2c3] bg-[#84d2c3]/22 px-7 py-3 text-sm font-semibold text-[#e0f7f1] shadow-[0_12px_26px_rgba(3,16,15,0.35)]"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Next Question
                  </motion.button>
                </motion.div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
