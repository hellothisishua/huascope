export default function FilterBar({
  status, onStatusChange,
  year, onYearChange,
  genre, onGenreChange,
  sort, onSortChange,
  years, genres,
}) {
  return (
    <div className="filter-bar">
      <div className="filter-row">
        <select value={status} onChange={e => onStatusChange(e.target.value)} className="filter-select">
          <option value="all">全部状态</option>
          <option value="want">🔖 想看</option>
          <option value="watching">▶️ 在看</option>
          <option value="watched">✅ 看过</option>
        </select>
        <select value={year} onChange={e => onYearChange(e.target.value)} className="filter-select">
          <option value="">全部年份</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={genre} onChange={e => onGenreChange(e.target.value)} className="filter-select">
          <option value="">全部分类</option>
          {genres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>
      <div className="filter-row">
        <select value={sort} onChange={e => onSortChange(e.target.value)} className="filter-select">
          <option value="added">按添加时间</option>
          <option value="year">按年份</option>
          <option value="rating">按评分</option>
          <option value="title">按片名</option>
        </select>
      </div>
    </div>
  );
}
