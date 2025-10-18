"use client";

import { useEffect, useState } from 'react';

interface Cloud {
  id: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
}

interface Bird {
  id: number;
  top: number;
  delay: number;
  duration: number;
  size: number;
}

const BirdSVG = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size * 0.6}
    viewBox="0 0 100 60"
    className="fill-gray-600 opacity-70"
  >
    <path d="M20 30 Q30 20, 40 30 Q50 20, 60 30 Q70 25, 80 30 Q70 35, 60 30 Q50 40, 40 30 Q30 40, 20 30 Z" />
    <circle cx="25" cy="28" r="2" className="fill-gray-800" />
  </svg>
);

const CloudSVG = ({ size }: { size: number }) => (
  <svg
    width={size}
    height={size * 0.6}
    viewBox="0 0 100 60"
    className="fill-white opacity-80"
  >
    <ellipse cx="25" cy="35" rx="15" ry="10" />
    <ellipse cx="40" cy="30" rx="20" ry="15" />
    <ellipse cx="60" cy="35" rx="18" ry="12" />
    <ellipse cx="75" cy="40" rx="12" ry="8" />
  </svg>
);

export default function NestBackground() {
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [birds, setBirds] = useState<Bird[]>([]);

  // 雲を生成
  useEffect(() => {
    const generateClouds = () => {
      const newClouds: Cloud[] = [];
      for (let i = 0; i < 5; i++) {
        newClouds.push({
          id: i,
          top: Math.random() * 60 + 10, // 10% - 70%の位置
          delay: Math.random() * 10, // 0-10秒の遅延
          duration: 15 + Math.random() * 10, // 15-25秒の持続時間
          size: 60 + Math.random() * 40, // 60-100pxのサイズ
        });
      }
      setClouds(newClouds);
    };

    generateClouds();
  }, []);

  // 鳥を定期的に生成
  useEffect(() => {
    let birdCounter = 0;
    
    const generateBird = () => {
      // より確実にユニークなIDを生成（タイムスタンプ + カウンター + ランダム値）
      const uniqueId = Date.now() * 1000 + birdCounter++ * 100 + Math.floor(Math.random() * 100);
      
      const newBird: Bird = {
        id: uniqueId,
        top: Math.random() * 50 + 20, // 20% - 70%の位置
        delay: 0,
        duration: 8 + Math.random() * 4, // 8-12秒の持続時間
        size: 30 + Math.random() * 20, // 30-50pxのサイズ
      };

      setBirds(prev => [...prev, newBird]);

      // 一定時間後に鳥を削除
      setTimeout(() => {
        setBirds(prev => prev.filter(bird => bird.id !== newBird.id));
      }, (newBird.duration + 2) * 1000);
    };

    // 初回生成
    generateBird();

    // 3-8秒間隔で鳥を生成
    const interval = setInterval(() => {
      generateBird();
    }, 3000 + Math.random() * 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-[-1]">
      {/* 鳥の巣の背景画像 */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
        style={{
          backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgdmlld0JveD0iMCAwIDQwMCA0MDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iMTUwIiBzdHJva2U9IiM5MjQwMGQiIHN0cm9rZS13aWR0aD0iNCIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC4zIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iMTIwIiBzdHJva2U9IiM5MjQwMGQiIHN0cm9rZS13aWR0aD0iMyIgZmlsbD0ibm9uZSIgb3BhY2l0eT0iMC4yIi8+CjxjaXJjbGUgY3g9IjIwMCIgY3k9IjIwMCIgcj0iOTAiIHN0cm9rZT0iIzkyNDAwZCIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIiBvcGFjaXR5PSIwLjEiLz4KPC9zdmc+')"
        }}
      />

      {/* 雲のアニメーション */}
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute animate-float-right"
          style={{
            top: `${cloud.top}%`,
            left: '-100px',
            animationDelay: `${cloud.delay}s`,
            animationDuration: `${cloud.duration}s`,
          }}
        >
          <CloudSVG size={cloud.size} />
        </div>
      ))}

      {/* 鳥のアニメーション */}
      {birds.map((bird) => (
        <div
          key={bird.id}
          className="absolute animate-fly-right"
          style={{
            top: `${bird.top}%`,
            left: '-60px',
            animationDelay: `${bird.delay}s`,
            animationDuration: `${bird.duration}s`,
          }}
        >
          <BirdSVG size={bird.size} />
        </div>
      ))}
    </div>
  );
}