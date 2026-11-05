export default function FavoriteNotice({favorites}) {
  return favorites.error ? <div className="favorite-notice" role="alert"><span>{favorites.error}</span><button type="button" className="p-button" onClick={favorites.retry}>Thử lại danh sách yêu thích</button></div> : null;
}
