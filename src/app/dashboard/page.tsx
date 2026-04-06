"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  RadialBarChart,
  RadialBar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ─── Translations ─────────────────────────────────────────────────────────────

type Language = "pt-BR" | "en-US";

const translations = {
  "pt-BR": {
    brand:           "Finance App.",
    greeting:        "Olá,",
    logout:          "Sair",
    pageTitle:       ["VISÃO", "GERAL DO", "ORÇAMENTO"],
    pageTitleAccent: 1,
    overLimitAlert:  (amount: string) => `Você está ${amount} acima do limite do orçamento`,
    monthLabel:      "Período",
    months: ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"],
    statLabels: {
      budgetInitial:     "Orçamento Inicial",
      budgetIncome:      "Receita",
      budgetTotal:       "Total Gasto",
      budgetLimit:       "Limite",
      budgetCreditLimit: "Limite de Crédito",
      budgetDesire:      "Gasto Desejado",
    },
    statSubs: {
      budgetIncome:      "Neste período",
      budgetLimit:       "Teto máximo",
      budgetCreditLimit: "Limite do cartão",
      budgetDesire:      "Meta de gasto",
    },
    chartAreaEyebrow:   "Receita vs Despesa",
    chartAreaTitle:     "Evolução Mensal",
    chartAreaIncome:    "Receita",
    chartAreaTotal:     "Total Gasto",
    chartRadialEyebrow: "Utilização de Crédito",
    chartRadialTitle:   "vs Limite de Crédito",
    chartRadialUsed:    "utilizado",
    chartRadialOverage: "Limite de crédito excedido",
    chartBarEyebrow:    "Distribuição do Orçamento",
    chartBarTitle:      "Todas as Categorias",
    deficitEyebrow:     "Acompanhamento de Limites",
    deficitTitle:       "Déficit no Limite",
    deficitBars: {
      totalVsLimit:   "Total vs Limite",
      totalVsCredit:  "Total vs Limite de Crédito",
      desireVsIncome: "Desejado vs Receita",
      totalVsInitial: "Total vs Orçamento Inicial",
    },
    overTag:    "EXCEDIDO",
    editHint:   "Enter para salvar • Esc para cancelar",
    saved:      "Salvo",
    loading:    "Carregando seus dados",
    errorTitle: "Falha ao carregar orçamento",
    errorBack:  "Voltar ao Login",
    currency:   "BRL",
    locale:     "pt-BR",
  },
  "en-US": {
    brand:           "Finance App.",
    greeting:        "Hey,",
    logout:          "Logout",
    pageTitle:       ["BUDGET", "OVER", "VIEW"],
    pageTitleAccent: 1,
    overLimitAlert:  (amount: string) => `You are ${amount} over your budget limit`,
    monthLabel:      "Period",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    statLabels: {
      budgetInitial:     "Initial Budget",
      budgetIncome:      "Income",
      budgetTotal:       "Total Spent",
      budgetLimit:       "Limit",
      budgetCreditLimit: "Credit Limit",
      budgetDesire:      "Desired Spend",
    },
    statSubs: {
      budgetIncome:      "This period",
      budgetLimit:       "Hard cap",
      budgetCreditLimit: "Card limit",
      budgetDesire:      "Spending target",
    },
    chartAreaEyebrow:   "Income vs Spending",
    chartAreaTitle:     "Monthly Trend",
    chartAreaIncome:    "Income",
    chartAreaTotal:     "Total Spent",
    chartRadialEyebrow: "Credit Utilization",
    chartRadialTitle:   "vs Credit Limit",
    chartRadialUsed:    "used",
    chartRadialOverage: "Credit limit exceeded",
    chartBarEyebrow:    "Budget Breakdown",
    chartBarTitle:      "All Categories",
    deficitEyebrow:     "Limit Tracking",
    deficitTitle:       "Deficit in Limit",
    deficitBars: {
      totalVsLimit:   "Total vs Limit",
      totalVsCredit:  "Total vs Credit Limit",
      desireVsIncome: "Desired vs Income",
      totalVsInitial: "Total vs Initial Budget",
    },
    overTag:    "OVER LIMIT",
    editHint:   "Press Enter to save • Esc to cancel",
    saved:      "Saved",
    loading:    "Loading your data",
    errorTitle: "Failed to load budget",
    errorBack:  "Back to Login",
    currency:   "USD",
    locale:     "en-US",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Budget {
  id:                  string;
  userId:              string;
  budget_initial:      number;
  budget_limit:        number;
  budget_credit_limit: number;
  budget_total:        number;
  budget_desire:       number;
  budget_income:       number;
}

type EditableField = keyof Omit<Budget, "id" | "userId">;

// ─── Number formatting ────────────────────────────────────────────────────────
// Backend values are raw integers without separators (e.g. 1000000 = R$ 10.000,00).
// We divide by 100 to get the decimal value, then format with locale-aware separators
// and always two decimal digits.

function formatCurrency(rawBackendValue: number, locale: string, currency: string): string {
  const decimalValue = rawBackendValue / 100;
  return new Intl.NumberFormat(locale, {
    style:                 "currency",
    currency:              currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimalValue);
}

// Parse a user-typed string into the backend raw integer representation.
// Handles both pt-BR style ("1.000,99") and en-US style ("1,000.99").
// The result is the value multiplied by 100, matching backend format.
function parseUserInputToRawValue(userInput: string): number {
  const sanitizedInput = userInput.replace(/[^\d.,]/g, "");
  const lastCommaIndex  = sanitizedInput.lastIndexOf(",");
  const lastPeriodIndex = sanitizedInput.lastIndexOf(".");

  let normalizedInput: string;

  if (lastCommaIndex > lastPeriodIndex) {
    // Comma is the decimal separator (pt-BR): "1.000,99" → "1000.99"
    normalizedInput = sanitizedInput.replace(/\./g, "").replace(",", ".");
  } else {
    // Period is the decimal separator (en-US): "1,000.99" → "1000.99"
    normalizedInput = sanitizedInput.replace(/,/g, "");
  }

  const parsedFloat = parseFloat(normalizedInput);
  if (isNaN(parsedFloat)) return 0;

  return Math.round(parsedFloat * 100);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculatePercentage(value: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(Math.round((value / limit) * 100), 100);
}

function resolveDeficitBarColorClass(percentage: number, isOver: boolean): string {
  if (isOver)          return "danger";
  if (percentage > 75) return "warning";
  return "safe";
}

// Simulate month-by-month multipliers until real historical API data is available.
const MONTHLY_SEED_MULTIPLIERS = [0.55, 0.62, 0.70, 0.75, 0.81, 0.88, 0.79, 0.85, 0.91, 0.94, 0.97, 1.00];

// ─── StatCard component ───────────────────────────────────────────────────────

interface StatCardProps {
  label:       string;
  rawValue:    number;
  subLabel?:   string;
  isAccent?:   boolean;
  isDanger?:   boolean;
  fieldKey:    EditableField;
  locale:      string;
  currency:    string;
  editHint:    string;
  savedLabel:  string;
  onSave:      (field: EditableField, newRawValue: number) => Promise<void>;
}

function StatCard({
  label,
  rawValue,
  subLabel,
  isAccent,
  isDanger,
  fieldKey,
  locale,
  currency,
  editHint,
  savedLabel,
  onSave,
}: StatCardProps) {
  const [isEditing, setIsEditing]   = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSaving, setIsSaving]     = useState(false);
  const [showSaved, setShowSaved]   = useState(false);

  const formattedDisplayValue = formatCurrency(rawValue, locale, currency);

  const handleActivateEdit = () => {
    const decimalRepresentation = (rawValue / 100).toFixed(2);
    setInputValue(decimalRepresentation);
    setIsEditing(true);
  };

  const handleConfirmSave = async () => {
    const newRawValue = parseUserInputToRawValue(inputValue);
    setIsSaving(true);
    await onSave(fieldKey, newRawValue);
    setIsSaving(false);
    setIsEditing(false);
    setShowSaved(true);
    setTimeout(() => setShowSaved(false), 2000);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter")  handleConfirmSave();
    if (event.key === "Escape") setIsEditing(false);
  };

  const cardClassName = [
    "stat-card",
    isAccent ? "accent" : "",
    isDanger ? "danger" : "",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={cardClassName}
      onClick={!isEditing ? handleActivateEdit : undefined}
      style={{ cursor: "pointer" }}
    >
      <span className="stat-card-label">{label}</span>

      {isEditing ? (
        <>
          <input
            autoFocus
            type="text"
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleConfirmSave}
            className="stat-card-edit-input"
            onClick={(event) => event.stopPropagation()}
          />
          <span className="stat-card-edit-hint">{editHint}</span>
        </>
      ) : (
        <div className="stat-card-editable-wrapper">
          <span className="stat-card-value">
            {isSaving ? "..." : formattedDisplayValue}
          </span>
          {/* Pencil icon visible on hover via CSS */}
          <svg
            className="edit-pencil-icon"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
      )}

      {showSaved && (
        <span className="save-indicator">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {savedLabel}
        </span>
      )}

      {subLabel && !isEditing && !showSaved && (
        <span className="stat-card-sub">{subLabel}</span>
      )}
    </div>
  );
}

// ─── DeficitBar component ─────────────────────────────────────────────────────

interface DeficitBarProps {
  label:    string;
  value:    number;
  limit:    number;
  locale:   string;
  currency: string;
  overTag:  string;
}

function DeficitBar({ label, value, limit, locale, currency, overTag }: DeficitBarProps) {
  const percentage = calculatePercentage(value, limit);
  const isOver     = value > limit;
  const colorClass = resolveDeficitBarColorClass(percentage, isOver);

  return (
    <div className="deficit-bar-item">
      <div className="deficit-bar-header">
        <span className="deficit-bar-label">{label}</span>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span className={`deficit-bar-values ${isOver ? "danger" : ""}`}>
            {formatCurrency(value, locale, currency)} / {formatCurrency(limit, locale, currency)}
          </span>
          {isOver && <span className="deficit-bar-over-tag">{overTag}</span>}
        </div>
      </div>
      <div className="deficit-bar-track">
        <div
          className={`deficit-bar-fill ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="deficit-bar-footer">
        <span className="deficit-bar-footer-start">0%</span>
        <span className={`deficit-bar-footer-end ${isOver ? "danger" : ""}`}>
          {percentage}%
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const CURRENT_MONTH_INDEX = new Date().getMonth();

export default function DashboardPage() {
  const router = useRouter();

  const [budget, setBudget]               = useState<Budget | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [username, setUsername]           = useState<string>("");
  const [userId, setUserId]               = useState<string>("");
  const [language, setLanguage]           = useState<Language>("pt-BR");
  const [selectedMonth, setSelectedMonth] = useState<number>(CURRENT_MONTH_INDEX);

  const currentTranslations = translations[language];

  // ── Auth guard & initial data fetch ──────────────────────────────────────

  useEffect(() => {
    const storedUserJson = localStorage.getItem("user");
    if (!storedUserJson) {
      router.push("/login");
      return;
    }

    let parsedUser: { id: string; username?: string };
    try {
      parsedUser = JSON.parse(storedUserJson);
    } catch {
      router.push("/login");
      return;
    }

    if (parsedUser.username) setUsername(parsedUser.username);
    setUserId(parsedUser.id);

    const fetchBudgetData = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user_finance?userId=${parsedUser.id}`
        );
        if (!response.ok) throw new Error("Failed to fetch budget data.");
        const data: Budget[] = await response.json();
        if (!data.length) throw new Error("No budget record found for this user.");
        setBudget(data[0]);
      } catch (fetchError: unknown) {
        setError(fetchError instanceof Error ? fetchError.message : "Unknown error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchBudgetData();
  }, [router]);

  // ── Inline field save with optimistic update ──────────────────────────────

  const handleFieldSave = useCallback(
    async (field: EditableField, newRawValue: number) => {
      if (!budget) return;

      const previousBudget = budget;
      const optimisticallyUpdatedBudget = { ...budget, [field]: newRawValue };
      setBudget(optimisticallyUpdatedBudget);

      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/budget/${budget.id}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(optimisticallyUpdatedBudget),
        });
      } catch {
        // Revert to previous state if the API call fails
        setBudget(previousBudget);
      }
    },
    [budget]
  );

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const handleToggleLanguage = () => {
    setLanguage((previous) => (previous === "pt-BR" ? "en-US" : "pt-BR"));
  };

  // ── Derived chart data ────────────────────────────────────────────────────

  const isOverBudgetLimit  = budget ? budget.budget_total > budget.budget_limit        : false;
  const isOverCreditLimit  = budget ? budget.budget_total > budget.budget_credit_limit : false;
  const deficitAboveLimit  = budget ? budget.budget_total - budget.budget_limit        : 0;

  const areaChartData = budget
    ? currentTranslations.months.map((monthName, monthIndex) => ({
        month:  monthName,
        income: Math.round((budget.budget_income / 100) * MONTHLY_SEED_MULTIPLIERS[monthIndex]),
        total:  Math.round((budget.budget_total  / 100) * MONTHLY_SEED_MULTIPLIERS[monthIndex]),
      }))
    : [];

  const barChartData = budget
    ? [
        { name: currentTranslations.statLabels.budgetInitial,     value: budget.budget_initial      / 100 },
        { name: currentTranslations.statLabels.budgetIncome,      value: budget.budget_income       / 100 },
        { name: currentTranslations.statLabels.budgetTotal,       value: budget.budget_total        / 100 },
        { name: currentTranslations.statLabels.budgetDesire,      value: budget.budget_desire       / 100 },
        { name: currentTranslations.statLabels.budgetLimit,       value: budget.budget_limit        / 100 },
        { name: currentTranslations.statLabels.budgetCreditLimit, value: budget.budget_credit_limit / 100 },
      ]
    : [];

  const creditUtilizationPercentage = budget
    ? calculatePercentage(budget.budget_total, budget.budget_credit_limit)
    : 0;

  const radialChartData = [
    {
      name:  currentTranslations.chartRadialUsed,
      value: creditUtilizationPercentage,
      fill:  isOverCreditLimit ? "#ef4444" : "#e8ff3b",
    },
  ];

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="loading-screen">
        <div>
          <div className="loading-spinner" />
          <p className="loading-label">{currentTranslations.loading}</p>
        </div>
      </div>
    );
  }

  // ── Error state ───────────────────────────────────────────────────────────

  if (error || !budget) {
    return (
      <div className="error-screen">
        <div>
          <p className="error-title">{currentTranslations.errorTitle}</p>
          <p className="error-message">{error}</p>
          <button className="error-back-button" onClick={handleLogout}>
            {currentTranslations.errorBack}
          </button>
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-page">

      {/* ── NAVBAR ── */}
      <nav className="navbar">
        <span className="navbar-brand">{currentTranslations.brand}</span>
        <div className="navbar-right">
          <span className="navbar-greeting">
            {currentTranslations.greeting}{" "}
            <strong>{username || userId}</strong>
          </span>
          <button className="navbar-language-button" onClick={handleToggleLanguage}>
            {language === "pt-BR" ? "EN" : "PT"}
          </button>
          <button className="navbar-logout-button" onClick={handleLogout}>
            {currentTranslations.logout}
          </button>
        </div>
      </nav>

      <div className="dashboard-content">

        {/* ── PAGE HEADER ── */}
        <div className="page-header animate-fade-up">
          <h1 className="page-title">
            {currentTranslations.pageTitle.map((titleLine, lineIndex) => (
              <span
                key={lineIndex}
                className={lineIndex === currentTranslations.pageTitleAccent ? "page-title-accent" : ""}
                style={{ display: "block" }}
              >
                {titleLine}
              </span>
            ))}
          </h1>

          {isOverBudgetLimit && (
            <div className="alert-over-limit">
              <span className="alert-pulse-dot" />
              {currentTranslations.overLimitAlert(
                formatCurrency(deficitAboveLimit, currentTranslations.locale, currentTranslations.currency)
              )}
            </div>
          )}
        </div>

        {/* ── MONTH PILLS ── */}
        <div className="month-pills-wrapper animate-fade-up-delayed">
          <p className="month-pills-label">{currentTranslations.monthLabel}</p>
          <div className="month-pills-list">
            {currentTranslations.months.map((monthName, monthIndex) => (
              <button
                key={monthIndex}
                className={`month-pill ${selectedMonth === monthIndex ? "active" : ""}`}
                onClick={() => setSelectedMonth(monthIndex)}
              >
                {monthName}
              </button>
            ))}
          </div>
        </div>

        {/* ── STAT CARDS ── */}
        <div className="stat-cards-grid animate-fade-up-delayed">
          <StatCard
            label={currentTranslations.statLabels.budgetInitial}
            rawValue={budget.budget_initial}
            fieldKey="budget_initial"
            locale={currentTranslations.locale}
            currency={currentTranslations.currency}
            editHint={currentTranslations.editHint}
            savedLabel={currentTranslations.saved}
            onSave={handleFieldSave}
            isAccent
          />
          <StatCard
            label={currentTranslations.statLabels.budgetIncome}
            rawValue={budget.budget_income}
            subLabel={currentTranslations.statSubs.budgetIncome}
            fieldKey="budget_income"
            locale={currentTranslations.locale}
            currency={currentTranslations.currency}
            editHint={currentTranslations.editHint}
            savedLabel={currentTranslations.saved}
            onSave={handleFieldSave}
          />
          <StatCard
            label={currentTranslations.statLabels.budgetTotal}
            rawValue={budget.budget_total}
            fieldKey="budget_total"
            locale={currentTranslations.locale}
            currency={currentTranslations.currency}
            editHint={currentTranslations.editHint}
            savedLabel={currentTranslations.saved}
            onSave={handleFieldSave}
            isDanger={isOverBudgetLimit}
          />
          <StatCard
            label={currentTranslations.statLabels.budgetLimit}
            rawValue={budget.budget_limit}
            subLabel={currentTranslations.statSubs.budgetLimit}
            fieldKey="budget_limit"
            locale={currentTranslations.locale}
            currency={currentTranslations.currency}
            editHint={currentTranslations.editHint}
            savedLabel={currentTranslations.saved}
            onSave={handleFieldSave}
          />
          <StatCard
            label={currentTranslations.statLabels.budgetCreditLimit}
            rawValue={budget.budget_credit_limit}
            subLabel={currentTranslations.statSubs.budgetCreditLimit}
            fieldKey="budget_credit_limit"
            locale={currentTranslations.locale}
            currency={currentTranslations.currency}
            editHint={currentTranslations.editHint}
            savedLabel={currentTranslations.saved}
            onSave={handleFieldSave}
            isDanger={isOverCreditLimit}
          />
          <StatCard
            label={currentTranslations.statLabels.budgetDesire}
            rawValue={budget.budget_desire}
            subLabel={currentTranslations.statSubs.budgetDesire}
            fieldKey="budget_desire"
            locale={currentTranslations.locale}
            currency={currentTranslations.currency}
            editHint={currentTranslations.editHint}
            savedLabel={currentTranslations.saved}
            onSave={handleFieldSave}
          />
        </div>

        {/* ── CHARTS ROW ── */}
        <div className="charts-grid animate-fade-up-late">

          {/* Area chart — income vs total spent over months */}
          <div className="chart-card">
            <p className="chart-card-eyebrow">{currentTranslations.chartAreaEyebrow}</p>
            <p className="chart-card-title">{currentTranslations.chartAreaTitle}</p>
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={areaChartData}>
                <defs>
                  <linearGradient id="gradientIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#e8ff3b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#e8ff3b" stopOpacity={0}   />
                  </linearGradient>
                  <linearGradient id="gradientTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "#555", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#555", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat(currentTranslations.locale, {
                      notation:              "compact",
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value: number) =>
                    formatCurrency(value * 100, currentTranslations.locale, currentTranslations.currency)
                  }
                />
                <Legend wrapperStyle={{ fontSize: "11px" }} />
                <Area
                  type="monotone"
                  dataKey="income"
                  name={currentTranslations.chartAreaIncome}
                  stroke="#e8ff3b"
                  strokeWidth={2}
                  fill="url(#gradientIncome)"
                  dot={false}
                  activeDot={{ radius: 4, fill: "#e8ff3b" }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  name={currentTranslations.chartAreaTotal}
                  stroke="#ef4444"
                  strokeWidth={2}
                  fill="url(#gradientTotal)"
                  dot={false}
                  activeDot={{ radius: 4, fill: "#ef4444" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Radial chart — credit utilization */}
          <div className="chart-card" style={{ display: "flex", flexDirection: "column" }}>
            <p className="chart-card-eyebrow">{currentTranslations.chartRadialEyebrow}</p>
            <p className="chart-card-title">{currentTranslations.chartRadialTitle}</p>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
              <ResponsiveContainer width="100%" height={190}>
                <RadialBarChart
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="90%"
                  data={radialChartData}
                  startAngle={90}
                  endAngle={-270}
                >
                  <RadialBar
                    dataKey="value"
                    cornerRadius={6}
                    background={{ fill: "#1a1a1a" }}
                  />
                  <Tooltip
                    formatter={(value: number) => [
                      `${value}%`,
                      currentTranslations.chartRadialUsed,
                    ]}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="radial-center-label">
                <span className={`radial-center-percentage ${isOverCreditLimit ? "danger" : ""}`}>
                  {creditUtilizationPercentage}%
                </span>
                <span className="radial-center-sub">{currentTranslations.chartRadialUsed}</span>
              </div>
            </div>
            {isOverCreditLimit && (
              <p style={{ color: "#ef4444", fontSize: "11px", textAlign: "center", textTransform: "uppercase", letterSpacing: "1.5px", marginTop: "8px" }}>
                ⚠ {currentTranslations.chartRadialOverage}
              </p>
            )}
          </div>
        </div>

        {/* ── BOTTOM ROW: Bar chart + Deficit progress bars ── */}
        <div className="bottom-grid animate-fade-up-last">

          {/* Bar chart — all budget categories side by side */}
          <div className="chart-card">
            <p className="chart-card-eyebrow">{currentTranslations.chartBarEyebrow}</p>
            <p className="chart-card-title">{currentTranslations.chartBarTitle}</p>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={barChartData} barSize={26}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#555", fontSize: 9 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#555", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) =>
                    new Intl.NumberFormat(currentTranslations.locale, {
                      notation:              "compact",
                      maximumFractionDigits: 1,
                    }).format(value)
                  }
                />
                <Tooltip
                  formatter={(value: number) =>
                    formatCurrency(value * 100, currentTranslations.locale, currentTranslations.currency)
                  }
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} fill="#e8ff3b" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Deficit progress bars */}
          <div className="chart-card">
            <p className="chart-card-eyebrow">{currentTranslations.deficitEyebrow}</p>
            <p className="chart-card-title">{currentTranslations.deficitTitle}</p>

            <DeficitBar
              label={currentTranslations.deficitBars.totalVsLimit}
              value={budget.budget_total}
              limit={budget.budget_limit}
              locale={currentTranslations.locale}
              currency={currentTranslations.currency}
              overTag={currentTranslations.overTag}
            />
            <DeficitBar
              label={currentTranslations.deficitBars.totalVsCredit}
              value={budget.budget_total}
              limit={budget.budget_credit_limit}
              locale={currentTranslations.locale}
              currency={currentTranslations.currency}
              overTag={currentTranslations.overTag}
            />
            <DeficitBar
              label={currentTranslations.deficitBars.desireVsIncome}
              value={budget.budget_desire}
              limit={budget.budget_income}
              locale={currentTranslations.locale}
              currency={currentTranslations.currency}
              overTag={currentTranslations.overTag}
            />
            <DeficitBar
              label={currentTranslations.deficitBars.totalVsInitial}
              value={budget.budget_total}
              limit={budget.budget_initial}
              locale={currentTranslations.locale}
              currency={currentTranslations.currency}
              overTag={currentTranslations.overTag}
            />
          </div>

        </div>
      </div>
    </div>
  );
}