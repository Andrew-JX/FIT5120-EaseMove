import { useMemo, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { navigateTo } from "../lib/navigation";
import { extremeWeatherQuizQuestions } from "../data/extremeWeather";

type AnswerMap = Record<string, number | null>;

export default function ExtremeWeatherQuizPage() {
  const createInitialAnswers = (): AnswerMap =>
    Object.fromEntries(extremeWeatherQuizQuestions.map((q) => [q.id, null]));

  const [answers, setAnswers] = useState<AnswerMap>(() => createInitialAnswers());
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const resetQuiz = () => {
    setAnswers(createInitialAnswers());
    setSubmitted({});
  };

  const score = useMemo(() => {
    return extremeWeatherQuizQuestions.reduce((sum, q) => {
      const answer = answers[q.id];
      if (answer === null) return sum;
      return sum + (answer === q.correctIndex ? 1 : 0);
    }, 0);
  }, [answers]);

  const completedCount = Object.values(submitted).filter(Boolean).length;
  const allCompleted = completedCount === extremeWeatherQuizQuestions.length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#081515" }}>
      <nav className="bg-[#081515]/80 backdrop-blur-md shadow-sm border-b border-white/20">
        <div className="px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigateTo("/extreme-weather-risks")}
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs sm:text-sm">Back</span>
          </button>
          <h1 className="text-sm font-semibold text-teal-800">Extreme Weather Quiz</h1>
        </div>
      </nav>

      <main className="px-4 sm:px-6 py-6">
        <div className="max-w-4xl mx-auto rounded-xl border border-gray-300 bg-white shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900">Quick Knowledge Check</h2>
          <p className="text-sm text-gray-600 mt-1">Choose one answer for each question and submit to get instant feedback.</p>

          <div className="mt-6 space-y-6">
            {extremeWeatherQuizQuestions.map((q, index) => {
              const selected = answers[q.id];
              const isSubmitted = Boolean(submitted[q.id]);
              const isCorrect = selected === q.correctIndex;

              return (
                <section key={q.id} className="rounded-lg border border-gray-200 p-4">
                  <h3 className="font-bold text-gray-900">Q{index + 1}. {q.prompt}</h3>
                  <div className="mt-3 space-y-2">
                    {q.options.map((opt, optIndex) => (
                      <label key={opt} className="flex items-start gap-2 text-sm text-gray-800 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          checked={selected === optIndex}
                          onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: optIndex }))}
                          disabled={isSubmitted}
                          className="mt-0.5"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>

                  {!isSubmitted && (
                    <button
                      type="button"
                      disabled={selected === null}
                      onClick={() => setSubmitted((prev) => ({ ...prev, [q.id]: true }))}
                      className="mt-3 px-3 py-1.5 rounded-md bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Submit
                    </button>
                  )}

                  {isSubmitted && (
                    <div className={`mt-3 rounded-md px-3 py-2 text-sm ${isCorrect ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                      <p className="font-bold">{isCorrect ? "Correct" : "Incorrect"}</p>
                      <p className="mt-1">{q.explanation}</p>
                    </div>
                  )}
                </section>
              );
            })}
          </div>

          {allCompleted && (
            <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h3 className="font-bold text-blue-900">Quiz Summary</h3>
              <p className="text-sm text-blue-900 mt-1">
                You scored {score} out of {extremeWeatherQuizQuestions.length}.
              </p>
              <p className="text-sm text-blue-900 mt-1">
                {score === extremeWeatherQuizQuestions.length
                  ? "Great work. You are ready to apply these safety steps outdoors."
                  : "Good progress. Review the feedback above and try applying it in your next trip."}
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={resetQuiz}
              className="px-5 py-2.5 rounded-lg border border-teal-600 text-teal-700 font-semibold hover:bg-teal-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
