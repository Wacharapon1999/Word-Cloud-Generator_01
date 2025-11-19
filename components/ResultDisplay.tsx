import React from 'react';

interface ResultDisplayProps {
  imageUrl: string | null;
  loading: boolean;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageUrl, loading }) => {
  if (loading) {
    return (
      <div className="mt-10 flex flex-col items-center justify-center p-12 border border-gray-200 rounded-3xl bg-white/50 backdrop-blur-sm min-h-[300px] shadow-sm">
        <div className="animate-spin rounded-full h-14 w-14 border-4 border-gray-200 border-t-[#007947] mb-6"></div>
        <p className="text-[#007947] font-medium font-kanit text-lg animate-pulse">กำลังสร้าง Word Cloud...</p>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="mt-10 bg-white p-6 rounded-3xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-gray-100 animate-fade-in">
      <h3 className="text-xl font-bold text-[#007947] mb-6 font-kanit flex items-center">
        <span className="w-2 h-8 bg-[#F40000] rounded-full mr-3 shadow-sm"></span>
        ผลลัพธ์ (Result)
      </h3>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-gray-50 border border-gray-100 group">
        <div className="absolute inset-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] opacity-50"></div>
        <img 
          src={imageUrl} 
          alt="Generated Word Cloud" 
          className="relative w-full h-full object-contain group-hover:scale-105 transition-transform duration-700 ease-out p-4 z-10"
        />
      </div>
      <div className="mt-6 flex justify-between items-center">
        <span className="text-sm text-[#007947] font-bold flex items-center bg-green-50 px-4 py-1.5 rounded-full border border-green-100">
          <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
          </svg>
          บันทึกสำเร็จ
        </span>
        <a 
          href={imageUrl} 
          download="cg_risk_wordcloud.png"
          className="text-white bg-[#F40000] hover:bg-[#d00000] text-sm font-bold transition-all px-6 py-3 rounded-xl shadow-lg shadow-red-200 hover:shadow-red-300 hover:-translate-y-0.5 active:translate-y-0 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          Download PNG
        </a>
      </div>
    </div>
  );
};

export default ResultDisplay;