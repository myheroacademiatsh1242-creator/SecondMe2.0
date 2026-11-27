export const CHRISTMAS_COINS = 30;
export type SeasonPreview = 'auto' | 'none' | 'christmas';

const vietnamCalendar = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'numeric', day: 'numeric',
});

export function christmasCalendarDate(now = new Date()): number {
  const parts = vietnamCalendar.formatToParts(now);
  const month = parts.find(part => part.type === 'month');
  const year = parts.find(part => part.type === 'year');
  const day = parts.find(part => part.type === 'day');
  return Number(year!.value) * 10000 + Number(month!.value) * 100 + Number(day!.value);
}

export function christmasSeason(now = new Date()): number | null {
  const month = Math.floor(christmasCalendarDate(now) / 100);
  return month % 100 === 12 ? Math.floor(month / 100) : null;
}
