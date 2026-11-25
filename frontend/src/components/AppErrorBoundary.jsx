import {Component} from 'react';
import GlobalLoading from './loading/GlobalLoading.jsx';
import {isPageLoadError} from '../routing/lazy-page.js';

/** A rejected lazy import must not unmount the entire application into a blank page. */
export default class AppErrorBoundary extends Component {
  state={error:null};
  static getDerivedStateFromError(error){return {error};}
  componentDidCatch(error,info){console.error('[NestHub] Không thể hiển thị ứng dụng',error,info.componentStack);}
  render(){
    if(!this.state.error)return this.props.children;
    const moduleFailure=isPageLoadError(this.state.error);
    return <GlobalLoading errorTitle={moduleFailure?'Không thể tải trang':'Trang gặp lỗi hiển thị'}
      error={moduleFailure?'Trình duyệt chưa tải được các tệp của trang. Hãy tải lại; nếu lỗi lặp lại, kiểm tra kết nối tới localhost trong trình duyệt.':'Có lỗi khi hiển thị nội dung. Vui lòng tải lại trang để thử lại.'}
      onRetry={()=>window.location.reload()} retryLabel="Tải lại trang"/>;
  }
}
