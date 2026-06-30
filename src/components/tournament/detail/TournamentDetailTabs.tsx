import React from 'react';

interface Props {
  activeTab: 'bracket' | 'history' | 'ranking' | 'technical';
  setActiveTab: (tab: 'bracket' | 'history' | 'ranking' | 'technical') => void;
  canShowHistoryTab: boolean;
  canShowRankingTab: boolean;
}

const tabLabels: Record<NonNullable<Props['activeTab']>, string> = {
  bracket: 'Cuadro',
  history: 'Mi historial',
  ranking: 'Clasificación',
  technical: 'Ficha técnica',
};

export const TournamentDetailTabs: React.FC<Props> = ({
  activeTab,
  setActiveTab,
  canShowHistoryTab,
  canShowRankingTab,
}) => (
  <div className="td-tabs">
    <button type="button" className={`td-tab ${activeTab === 'bracket' ? 'active' : ''}`} onClick={() => setActiveTab('bracket')}>
      {tabLabels.bracket}
    </button>
    {canShowHistoryTab && (
      <button type="button" className={`td-tab ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
        {tabLabels.history}
      </button>
    )}
    {canShowRankingTab && (
      <button type="button" className={`td-tab ${activeTab === 'ranking' ? 'active' : ''}`} onClick={() => setActiveTab('ranking')}>
        {tabLabels.ranking}
      </button>
    )}
    <button type="button" className={`td-tab ${activeTab === 'technical' ? 'active' : ''}`} onClick={() => setActiveTab('technical')}>
      {tabLabels.technical}
    </button>
  </div>
);
