import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { authColors as c, authRadius } from '@/components/auth/tokens';
import { AnimatedPressable } from '@/components/home/animated-pressable';
import {
  buildContractHtmlDocument,
  extractContractToc,
  type ContractTocItem,
  type RentalContractRecord,
} from '@/services/rental-contracts';

const MIN_ZOOM = 85;
const MAX_ZOOM = 160;
const ZOOM_STEP = 15;

export function ContractDocumentViewer({
  contract,
  exportingPdf,
  onOpenToc,
  onExportPdf,
  jumpAnchor,
  jumpNonce,
}: {
  contract: RentalContractRecord;
  exportingPdf: boolean;
  onOpenToc: (items: ContractTocItem[]) => void;
  onExportPdf: () => void;
  jumpAnchor: string | null;
  jumpNonce: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [zoom, setZoom] = useState(100);

  const tocItems = useMemo(() => extractContractToc(contract), [contract]);
  const html = useMemo(
    () => buildContractHtmlDocument(contract, { fontScalePercent: zoom }),
    [contract, zoom]
  );

  useEffect(() => {
    if (!jumpAnchor) return;
    const safeId = jumpAnchor.replace(/[^a-zA-Z0-9_-]/g, '');
    const doc = iframeRef.current?.contentDocument;
    const el = doc?.getElementById(safeId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [jumpAnchor, jumpNonce]);

  return (
    <View style={s.container}>
      <View style={s.toolbar}>
        <AnimatedPressable
          scaleTo={0.97}
          accessibilityLabel="Mở mục lục điều khoản hợp đồng"
          style={s.tocBtn}
          onPress={() => onOpenToc(tocItems)}
        >
          <Feather name="list" size={15} color={c.primaryDark} />
          <Text style={s.tocBtnText}>Mục lục</Text>
        </AnimatedPressable>

        <View style={s.zoomGroup}>
          <AnimatedPressable
            scaleTo={0.95}
            disabled={zoom <= MIN_ZOOM}
            style={[s.zoomBtn, zoom <= MIN_ZOOM && { opacity: 0.4 }]}
            onPress={() => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
          >
            <Text style={s.zoomBtnText}>A-</Text>
          </AnimatedPressable>
          <Text style={s.zoomVal}>{zoom}%</Text>
          <AnimatedPressable
            scaleTo={0.95}
            disabled={zoom >= MAX_ZOOM}
            style={[s.zoomBtn, zoom >= MAX_ZOOM && { opacity: 0.4 }]}
            onPress={() => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
          >
            <Text style={s.zoomBtnText}>A+</Text>
          </AnimatedPressable>
        </View>

        <AnimatedPressable
          scaleTo={0.97}
          disabled={exportingPdf}
          style={[s.pdfBtn, exportingPdf && { opacity: 0.6 }]}
          onPress={onExportPdf}
        >
          {exportingPdf ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Feather name="download" size={14} color="#FFFFFF" />
          )}
          <Text style={s.pdfBtnText}>{exportingPdf ? 'Đang xuất…' : 'PDF'}</Text>
        </AnimatedPressable>
      </View>

      <View style={s.viewport}>
        <iframe
          ref={iframeRef}
          title="Nội dung hợp đồng thuê phòng"
          srcDoc={html}
          style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#FAFAF7' }}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, gap: 10 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  tocBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.softMint,
    borderWidth: 1,
    borderColor: '#C5E3DB',
  },
  tocBtnText: { fontSize: 12.5, fontWeight: '700', color: c.primaryDark },
  zoomGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: c.surface,
    borderRadius: authRadius.round,
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: 4,
    paddingVertical: 3,
    gap: 4,
  },
  zoomBtn: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: authRadius.round },
  zoomBtnText: { fontSize: 12.5, fontWeight: '800', color: c.forestInk },
  zoomVal: { minWidth: 38, textAlign: 'center', fontSize: 12, fontWeight: '700', color: c.textSecondary },
  pdfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: authRadius.round,
    backgroundColor: c.primary,
  },
  pdfBtnText: { fontSize: 12.5, fontWeight: '700', color: '#FFFFFF' },
  viewport: { flex: 1, minHeight: 360, backgroundColor: c.background },
});
