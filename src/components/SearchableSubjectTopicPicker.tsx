import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Search, X } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { SUBJECT_COLOR_PALETTE } from '../types/database';

interface SearchableSubjectTopicPickerProps {
  subjectId: string;
  topicId: string;
  onChangeSubject: (id: string) => void;
  onChangeTopic: (id: string) => void;
  requiredSubject?: boolean;
}

export const SearchableSubjectTopicPicker: React.FC<SearchableSubjectTopicPickerProps> = ({
  subjectId,
  topicId,
  onChangeSubject,
  onChangeTopic,
  requiredSubject = true,
}) => {
  const { subjects, topics, primaryGoal, addSubject, addTopic } = useData();
  const activeSubjects = useMemo(() => subjects.filter((s) => !s.archived_at), [subjects]);

  const [subjectOpen, setSubjectOpen] = useState(false);
  const [subjectQuery, setSubjectQuery] = useState('');
  const [creatingSubject, setCreatingSubject] = useState(false);
  const [newSubjectColor, setNewSubjectColor] = useState<string>(SUBJECT_COLOR_PALETTE[0]);

  const [topicOpen, setTopicOpen] = useState(false);
  const [topicQuery, setTopicQuery] = useState('');
  const [creatingTopic, setCreatingTopic] = useState(false);

  const selectedSubject = useMemo(
    () => activeSubjects.find((s) => s.id === subjectId) || subjects.find((s) => s.id === subjectId),
    [activeSubjects, subjects, subjectId]
  );

  const subjectTopics = useMemo(
    () => topics.filter((t) => t.subject_id === subjectId),
    [topics, subjectId]
  );

  const selectedTopic = useMemo(
    () => subjectTopics.find((t) => t.id === topicId),
    [subjectTopics, topicId]
  );

  const filteredSubjects = useMemo(() => {
    const q = subjectQuery.trim().toLowerCase();
    if (!q) return activeSubjects;
    return activeSubjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [activeSubjects, subjectQuery]);

  const filteredTopics = useMemo(() => {
    const q = topicQuery.trim().toLowerCase();
    if (!q) return subjectTopics;
    return subjectTopics.filter((t) => t.name.toLowerCase().includes(q));
  }, [subjectTopics, topicQuery]);

  const exactSubjectMatch = activeSubjects.some(
    (s) => s.name.trim().toLowerCase() === subjectQuery.trim().toLowerCase()
  );

  const exactTopicMatch = subjectTopics.some(
    (t) => t.name.trim().toLowerCase() === topicQuery.trim().toLowerCase()
  );

  const handleCreateSubjectInline = async () => {
    const clean = subjectQuery.trim();
    if (clean.length < 2 || creatingSubject) return;
    setCreatingSubject(true);
    try {
      const created = await addSubject(
        {
          name: clean,
          color: newSubjectColor,
          difficulty: 'intermediario',
          priority: 'media',
          notes: null,
          archived_at: null,
        },
        primaryGoal
          ? [{ goal_id: primaryGoal.id, exam_weight: null, priority: 'media' }]
          : []
      );
      onChangeSubject(created.id);
      onChangeTopic('');
      setSubjectQuery('');
      setSubjectOpen(false);
    } finally {
      setCreatingSubject(false);
    }
  };

  const handleCreateTopicInline = async () => {
    const clean = topicQuery.trim();
    if (!subjectId || clean.length < 2 || creatingTopic) return;
    setCreatingTopic(true);
    try {
      const created = await addTopic({
        subject_id: subjectId,
        parent_topic_id: null,
        name: clean,
        description: null,
        display_order: subjectTopics.length + 1,
      });
      onChangeTopic(created.id);
      setTopicQuery('');
      setTopicOpen(false);
    } finally {
      setCreatingTopic(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Disciplina Picker */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
          Disciplina {requiredSubject ? '*' : ''}
        </label>
        <button
          type="button"
          onClick={() => {
            setSubjectOpen((v) => !v);
            setTopicOpen(false);
          }}
          className="w-full min-h-[44px] flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-left text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            {selectedSubject && (
              <span
                className="w-2.5 h-2.5 rounded-xs shrink-0"
                style={{ backgroundColor: selectedSubject.color }}
              />
            )}
            <span className="truncate font-medium">
              {selectedSubject ? selectedSubject.name : 'Selecionar ou criar disciplina'}
            </span>
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
        </button>

        {subjectOpen && (
          <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 space-y-2 shadow-sm">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={subjectQuery}
                onChange={(e) => setSubjectQuery(e.target.value)}
                placeholder="Buscar ou digitar nova disciplina..."
                className="w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
              />
              {subjectQuery && (
                <button
                  type="button"
                  onClick={() => setSubjectQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                  aria-label="Limpar busca"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-44 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredSubjects.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    onChangeSubject(s.id);
                    onChangeTopic('');
                    setSubjectOpen(false);
                    setSubjectQuery('');
                  }}
                  className="w-full min-h-[42px] flex items-center justify-between px-2.5 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
                >
                  <span className="flex items-center gap-2.5 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {s.name}
                    </span>
                  </span>
                  {s.id === subjectId && <Check className="w-4 h-4 text-[#D4A853] shrink-0" />}
                </button>
              ))}
              {filteredSubjects.length === 0 && !subjectQuery.trim() && (
                <p className="py-3 text-center text-xs text-slate-500">
                  Digite acima para cadastrar sua primeira disciplina.
                </p>
              )}
            </div>

            {subjectQuery.trim().length >= 2 && !exactSubjectMatch && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-1.5 px-1">
                  {SUBJECT_COLOR_PALETTE.slice(0, 6).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewSubjectColor(c)}
                      className={`w-5 h-5 rounded-full ${
                        newSubjectColor === c ? 'ring-2 ring-offset-1 ring-slate-900 dark:ring-white' : ''
                      }`}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCreateSubjectInline}
                  disabled={creatingSubject}
                  className="w-full min-h-[42px] flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] dark:bg-[#D4A853] px-3 py-2 text-xs font-semibold text-white dark:text-[#0F172A]"
                >
                  <Plus className="w-4 h-4" />
                  {creatingSubject ? 'Criando...' : `Criar disciplina "${subjectQuery.trim()}"`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Assunto Picker */}
      {subjectId && (
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Assunto
          </label>
          <button
            type="button"
            onClick={() => {
              setTopicOpen((v) => !v);
              setSubjectOpen(false);
            }}
            className="w-full min-h-[44px] flex items-center justify-between gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2.5 text-left text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
          >
            <span className="truncate font-medium">
              {selectedTopic ? selectedTopic.name : 'Geral da disciplina (ou buscar/criar)'}
            </span>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
          </button>

          {topicOpen && (
            <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 space-y-2 shadow-sm">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={topicQuery}
                  onChange={(e) => setTopicQuery(e.target.value)}
                  placeholder="Buscar ou digitar novo assunto..."
                  className="w-full min-h-[40px] rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 pl-9 pr-8 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#D4A853]"
                />
                {topicQuery && (
                  <button
                    type="button"
                    onClick={() => setTopicQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                    aria-label="Limpar busca"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/80">
                <button
                  type="button"
                  onClick={() => {
                    onChangeTopic('');
                    setTopicOpen(false);
                    setTopicQuery('');
                  }}
                  className="w-full min-h-[40px] flex items-center justify-between px-2.5 py-2 text-left text-xs font-medium text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
                >
                  <span>Geral da disciplina</span>
                  {!topicId && <Check className="w-4 h-4 text-[#D4A853]" />}
                </button>
                {filteredTopics.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => {
                      onChangeTopic(t.id);
                      setTopicOpen(false);
                      setTopicQuery('');
                    }}
                    className="w-full min-h-[42px] flex items-center justify-between px-2.5 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg"
                  >
                    <span className="truncate text-slate-800 dark:text-slate-100">
                      {t.parent_topic_id ? `↳ ${t.name}` : t.name}
                    </span>
                    {t.id === topicId && <Check className="w-4 h-4 text-[#D4A853] shrink-0" />}
                  </button>
                ))}
              </div>

              {topicQuery.trim().length >= 2 && !exactTopicMatch && (
                <button
                  type="button"
                  onClick={handleCreateTopicInline}
                  disabled={creatingTopic}
                  className="w-full min-h-[42px] flex items-center justify-center gap-2 rounded-lg bg-[#0F172A] dark:bg-[#D4A853] px-3 py-2 text-xs font-semibold text-white dark:text-[#0F172A]"
                >
                  <Plus className="w-4 h-4" />
                  {creatingTopic ? 'Criando...' : `Criar assunto "${topicQuery.trim()}"`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
