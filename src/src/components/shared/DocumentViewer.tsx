'use client';

// src/components/shared/DocumentViewer.tsx
// Preview embed untuk file PDF (lewat <iframe> native browser) dan
// PPT/PPTX (lewat Microsoft Office Online embed viewer, karena browser
// tidak bisa render PPT secara native). Dipakai di halaman materi siswa
// & orang tua (read-only).

export function DocumentViewer({ url, type, title }: { url: string; type: 'document' | 'presentation'; title?: string }) {
  if (type === 'presentation') {
    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`;
    return (
      <div className="rounded-xl2 overflow-hidden border border-teal-100 bg-cream" style={{ aspectRatio: '16 / 10' }}>
        <iframe
          src={officeViewerUrl}
          title={title ?? 'Presentasi'}
          className="w-full h-full"
          frameBorder={0}
        />
      </div>
    );
  }

  // PDF — browser modern bisa render langsung lewat iframe.
  return (
    <div className="rounded-xl2 overflow-hidden border border-teal-100 bg-cream" style={{ aspectRatio: '16 / 10' }}>
      <iframe src={url} title={title ?? 'Dokumen'} className="w-full h-full" />
    </div>
  );
}
