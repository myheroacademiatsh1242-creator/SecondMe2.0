import {rarityName,RARITY_COLORS} from '../game/logic/rarity.ts';
import {ChestCurrencyIcon} from './ChestCurrencyIcon.tsx';
import React, { useEffect, useState, useMemo } from 'react';
import type { ChestKind } from './ChestSprite.tsx';
import {
  loadChestHistory,
  clearChestHistory,
  calculateChestStats,
  getRewardMeta,
  type ChestHistoryItem,
} from '../game/logic/chestHistory.ts';
import './chestHistory.css';

export interface ChestHistoryModalProps {
  vi: boolean;
  onClose: () => void;
}

const KIND_LABELS: Record<ChestKind, { vi: string; en: string }> = {
  wood: { vi: 'Phàm Phẩm', en: 'Common' },
  royal: { vi: 'Hoàng Phẩm', en: 'Royal' },
  platinum: { vi: 'Đế Phẩm', en: 'Imperial' },
  crystal: { vi: 'Chân Phẩm Vô Song', en: 'Peerless' },
};

const ITEMS_PER_PAGE = 7;

function formatTimestamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
}

export function ChestHistoryModal({ vi, onClose }: ChestHistoryModalProps) {
  const [history, setHistory] = useState<ChestHistoryItem[]>(() => loadChestHistory());
  const [filterKind, setFilterKind] = useState<ChestKind | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);

  // Keyboard navigation & ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  // Overall stats
  const stats = useMemo(() => calculateChestStats(history), [history]);

  // Filtered items
  const filteredItems = useMemo(() => {
    if (filterKind === 'all') return history;
    return history.filter((item) => item.kind === filterKind);
  }, [history, filterKind]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterKind]);

  const pageItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  const handleClear = () => {
    clearChestHistory();
    setHistory([]);
    setConfirmClear(false);
    setCurrentPage(1);
  };

  return (
    <div className="chest-history-backdrop" onClick={onClose}>
      <section
        className="chest-history-modal"
        role="dialog"
        aria-modal="true"
        aria-label={vi ? 'Nhật ký mở rương' : 'Chest history'}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <header className="chest-history-header">
          <div className="chest-history-title-wrap">
            <h2 className="chest-history-title">
              📜 {vi ? 'NHẬT KÝ MỞ RƯƠNG' : 'CHEST CHRONICLES'}
            </h2>
            <p className="chest-history-subtitle">
              {vi
                ? 'Ghi chép vận mệnh & kỳ bảo khai mở từ thâm lâm bí cảnh'
                : 'Chronicles of fortunes and relics unsealed from the sacred woods'}
            </p>
          </div>
          <button
            type="button"
            className="chest-history-close"
            onClick={onClose}
            aria-label={vi ? 'Đóng lịch sử' : 'Close history'}
          >
            ×
          </button>
        </header>

        {/* Filter Tabs (Genshin banner selector style) */}
        <nav className="chest-history-tabs" aria-label={vi ? 'Bộ lọc loại rương' : 'Chest type filter'}>
          <button
            type="button"
            className={`chest-tab-btn ${filterKind === 'all' ? 'is-active' : ''}`}
            onClick={() => setFilterKind('all')}
          >
            {vi ? 'Tất cả' : 'All'} ({history.length})
          </button>
          {(['royal', 'wood'] as const).map((k) => {
            const count = history.filter((item) => item.kind === k).length;
            return (
              <button
                key={k}
                type="button"
                className={`chest-tab-btn ${filterKind === k ? 'is-active' : ''}`}
                onClick={() => setFilterKind(k)}
              >
                {vi ? KIND_LABELS[k].vi : KIND_LABELS[k].en} ({count})
              </button>
            );
          })}
        </nav>

        {/* Overview Stats Bar (Genshin Pity Counter) */}
        <div className="chest-history-stats-bar">
          <div className="chest-stat-group">
            <div className="chest-stat-item">
              <span className="stat-label">📦 {vi ? 'Tổng mở' : 'Total'}:</span>
              <strong className="stat-value">{stats.total}</strong>
            </div>
            <div className="chest-stat-item tier-5-stat">
              <span className="stat-label">🔥 {vi ? 'Tinh Chế' : 'Refined'}:</span>
              <strong className="stat-value">{stats.fireCount}</strong>
            </div>
            <div className="chest-stat-item tier-4-stat">
              <span className="stat-label">✨ {vi ? 'Thượng Hạng' : 'Deluxe'}:</span>
              <strong className="stat-value">{stats.epicCount}</strong>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="chest-history-table-container">
          {pageItems.length === 0 ? (
            <div className="chest-history-empty">
              <span className="empty-icon">📭</span>
              <p>
                {vi
                  ? 'Chưa có bản ghi mở rương nào trong mục này.'
                  : 'No chest summon records found in this category.'}
              </p>
              <small>
                {vi
                  ? 'Hãy mở rương để bắt đầu lưu lại nhật ký kỳ bảo!'
                  : 'Open some chests to start recording your chronicles!'}
              </small>
            </div>
          ) : (
            <table className="chest-history-table">
              <thead>
                <tr>
                  <th className="th-item">{vi ? 'Vật phẩm' : 'Item'}</th>
                  <th className="th-tier">{vi ? 'Phẩm cấp' : 'Rarity'}</th>
                  <th className="th-kind">{vi ? 'Loại rương' : 'Chest Type'}</th>
                  <th className="th-time">{vi ? 'Thời gian' : 'Time'}</th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((item) => {
                  const meta = getRewardMeta(item.rewardId, vi);
                  const isCoin = meta.iconType === 'coin';
                  const isTime = meta.iconType === 'time';
                  const isAtlas = meta.iconType === 'atlas';

                  return (
                    <tr
                      key={item.id}
                      className={`chest-history-row row-tier-${meta.tier}`}
                    >
                      {/* Item Column with mini-icon */}
                      <td className="td-item">
                        <div className="item-cell-wrap">
                          <span className={`item-mini-icon-box tier-${meta.tier}`}>
                            {meta.iconType==='commonCrystal'&&<ChestCurrencyIcon currency="commonCrystals" size={28}/>}
                            {isCoin && (
                              <img
                                src={`${import.meta.env.BASE_URL}assets/ui/raccoon-coin.png`}
                                alt="Coin"
                                className="history-mini-icon coin-icon"
                              />
                            )}
                            {isTime && (
                              <img
                                src={`${import.meta.env.BASE_URL}assets/ui/them-mot-chut.png`}
                                alt="Time Potion"
                                className="history-mini-icon time-icon"
                              />
                            )}
                            {(meta.iconType==='manaSmall'||meta.iconType==='manaLarge')&&<img className="history-mini-icon time-icon" src={`${import.meta.env.BASE_URL}assets/items/${meta.iconType==='manaSmall'?'mana-small':'mana-large'}.png`} alt=""/>}
                            {isAtlas && meta.atlasIndex !== undefined && (
                              <span
                                className="history-mini-icon atlas-icon"
                                aria-hidden="true"
                                style={{
                                  backgroundImage: `url(${import.meta.env.BASE_URL}assets/shop/item-atlas.png)`,
                                  backgroundPosition: `${(meta.atlasIndex % 3) * 50}% ${
                                    Math.floor(meta.atlasIndex / 3) * 100
                                  }%`,
                                }}
                              />
                            )}
                          </span>
                          <div className="item-name-info">
                            <span className="item-title">{meta.name}</span>
                            <span className="item-amount-badge">{meta.amountText}</span>
                          </div>
                        </div>
                      </td>

                      {/* Rarity & Stars */}
                      <td className="td-tier">
                        <div className="tier-cell-wrap">
                          <span className={`tier-badge tier-${meta.tier}`} style={{color:RARITY_COLORS[meta.tier],borderColor:RARITY_COLORS[meta.tier]}}>
                            {meta.stars === 5 && '🔥 '}
                            {meta.stars === 4 && '✨ '}
                            {meta.stars === 3 && '🌿 '}
                            {rarityName(meta.tier,vi)}
                          </span>
                          <span className="stars-glyph">
                            {'★'.repeat(meta.stars)}
                          </span>
                        </div>
                      </td>

                      {/* Chest Kind */}
                      <td className="td-kind">
                        <span className={`kind-tag kind-${item.kind}`}>
                          {vi ? KIND_LABELS[item.kind]?.vi : KIND_LABELS[item.kind]?.en}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="td-time">
                        <time dateTime={new Date(item.timestamp).toISOString()}>
                          {formatTimestamp(item.timestamp)}
                        </time>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer & Pagination */}
        <footer className="chest-history-footer">
          <div className="footer-left">
            {confirmClear ? (
              <div className="clear-confirm-wrap">
                <span className="confirm-text">
                  {vi ? 'Xác nhận xóa hết lịch sử?' : 'Confirm clear all history?'}
                </span>
                <button
                  type="button"
                  className="confirm-yes-btn"
                  onClick={handleClear}
                >
                  {vi ? 'Xóa vĩnh viễn' : 'Yes, clear'}
                </button>
                <button
                  type="button"
                  className="confirm-no-btn"
                  onClick={() => setConfirmClear(false)}
                >
                  {vi ? 'Hủy' : 'Cancel'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="clear-history-btn"
                disabled={history.length === 0}
                onClick={() => setConfirmClear(true)}
              >
                🗑️ {vi ? 'Xóa lịch sử' : 'Clear history'}
              </button>
            )}
          </div>

          <div className="footer-pagination">
            <button
              type="button"
              className="page-nav-btn prev-btn"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              aria-label={vi ? 'Trang trước' : 'Previous page'}
            >
              ◀ {vi ? 'Trang trước' : 'Prev'}
            </button>
            <span className="page-indicator">
              {vi ? 'Trang' : 'Page'} <b>{currentPage}</b> / {totalPages}
            </span>
            <button
              type="button"
              className="page-nav-btn next-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              aria-label={vi ? 'Trang sau' : 'Next page'}
            >
              {vi ? 'Trang sau' : 'Next'} ▶
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
