import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { FieldLabel, Input, Select } from '../components/ui/Field';
import { useData } from '../contexts/DataContext';
import { GOAL_AREAS } from '../types/database';

export const OnboardingPage: React.FC = () => {
  const { profile, completeOnboarding } = useData();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [area, setArea] = useState('Geral');
  const [examName, setExamName] = useState('');
  const [weeklyStudyTarget, setWeeklyStudyTarget] = useState('15');
  const [weeklyQuestionTarget, setWeeklyQuestionTarget] = useState('150');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (fullName.trim().length < 2) {
      setErrorMsg('Informe seu nome.');
      return;
    }

    setSaving(true);
    try {
      await completeOnboarding({
        fullName: fullName.trim(),
        area,
        examName: examName.trim(),
        position: '',
        examBoard: '',
        examDate: '',
        weeklyStudyTarget: Math.max(0, Number(weeklyStudyTarget) || 0),
        weeklyQuestionTarget: Math.max(0, Math.trunc(Number(weeklyQuestionTarget) || 0)),
        skipGoal: false,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao salvar configuração inicial.');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = async () => {
    setErrorMsg(null);
    setSaving(true);
    try {
      await completeOnboarding({
        fullName: fullName.trim() || profile?.full_name || 'Estudante',
        area: 'Geral',
        examName: '',
        position: '',
        examBoard: '',
        examDate: '',
        weeklyStudyTarget: 0,
        weeklyQuestionTarget: 0,
        skipGoal: true,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao avançar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-dvh bg-[var(--bg-app)] text-[var(--text-main)] flex flex-col justify-center py-8 px-6">
      <div className="max-w-[420px] w-full mx-auto space-y-5">
        <div className="flex items-center justify-center">
          <BrandLogo size="md" />
        </div>

        <Card padding="lg">
          <h1 className="text-xl font-bold text-[var(--text-main)] tracking-tight">
            Configuração inicial
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Defina o essencial agora ou pule para começar a estudar.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            <div>
              <FieldLabel htmlFor="onb-name">Seu nome *</FieldLabel>
              <Input
                id="onb-name"
                type="text"
                placeholder="Ex: Mariana Silva"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div>
              <FieldLabel htmlFor="onb-area">Área de interesse (opcional)</FieldLabel>
              <Select id="onb-area" value={area} onChange={(e) => setArea(e.target.value)}>
                <option value="Geral">Ainda não defini / Geral</option>
                {GOAL_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <FieldLabel htmlFor="onb-exam">Concurso pretendido (opcional)</FieldLabel>
              <Input
                id="onb-exam"
                type="text"
                placeholder="Ex: TJ-SP, Polícia Federal"
                value={examName}
                onChange={(e) => setExamName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel htmlFor="onb-hours">Meta semanal (h)</FieldLabel>
                <Input
                  id="onb-hours"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={120}
                  step="0.5"
                  value={weeklyStudyTarget}
                  onChange={(e) => setWeeklyStudyTarget(e.target.value)}
                  className="tabular-nums"
                />
              </div>
              <div>
                <FieldLabel htmlFor="onb-questions">Questões/semana</FieldLabel>
                <Input
                  id="onb-questions"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min={0}
                  step={10}
                  value={weeklyQuestionTarget}
                  onChange={(e) => setWeeklyQuestionTarget(e.target.value)}
                  className="tabular-nums"
                />
              </div>
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-[var(--negative)]" role="alert">
                {errorMsg}
              </p>
            )}

            <div className="pt-2 space-y-2.5">
              <Button type="submit" fullWidth disabled={saving}>
                {saving ? 'Salvando...' : 'Começar agora'}
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                type="button"
                variant="secondary"
                fullWidth
                onClick={handleSkip}
                disabled={saving}
                className="!text-xs !text-[var(--text-muted)]"
              >
                Pular e começar a estudar
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
