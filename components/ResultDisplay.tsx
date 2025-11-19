import React from 'react';

interface ResultDisplayProps {
  imageUrl: string | null;
  loading: boolean;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageUrl, loading }) => {
  if (loading) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 min-h-[300px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Generating Word Cloud...</p>
        <p className="text-sm text-gray-400 mt-2">Analyzing text and calculating layout</p>
      </div>
    );
  }

  if (!imageUrl) {
    return null;
  }

  return (
    <div className="mt-8 bg-white p-4 rounded-xl shadow-lg border border-gray-100 animate-fade-in">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Generated Result</h3>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-gray-100">
        <img 
          src={imageUrl} 
          alt="Generated Word Cloud" 
          className="w-full h-full object-contain hover:scale-105 transition-transform duration-500"
        />
      </div>
      <div className="mt-4 flex justify-between items-center">
        <span className="text-sm text-green-600 font-medium flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
          </svg>
          Saved to Database
        </span>
        <a 
          href={imageUrl} 
          download="wordcloud.png"
          className="text-indigo-600 hover:text-indigo-800 text-sm font-medium transition-colors"
        >
          Download PNG
        </a>
      </div>
    </div>
  );
};

export default ResultDisplay;