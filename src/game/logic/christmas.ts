export const CHRISTMAS_COINS = 30;
export type SeasonPreview = 'auto' | 'none' | 'christmas';

const vietnamCalendar = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric',
});

export function christmasSeason(now = new Date()): number | null {
  const parts = vietnamCalendar.formatToParts(now);
  const month = parts.find(part => part.type === 'month');
  const year = parts.find(part => part.type === 'year');
  return month?.value === '12' && year ? Number(year.value) : null;
}
