interface NestSVGProps {
  className?: string
  width?: number
  height?: number
}

export default function NestSVG({ className = "", width = 320, height = 200 }: NestSVGProps) {
  return (
    <svg viewBox="0 0 320 200" className={`w-full h-full ${className}`} width={width} height={height}>
      {/* Main nest bowl - bottom layer */}
      <ellipse cx="160" cy="150" rx="140" ry="40" fill="#8B4513" opacity="0.8" />
      
      {/* Middle layer */}
      <ellipse cx="160" cy="142" rx="135" ry="35" fill="#A0522D" opacity="0.9" />
      
      {/* Top layer */}
      <ellipse cx="160" cy="135" rx="128" ry="32" fill="#CD853F" />
      
      {/* Twigs around the nest rim */}
      <line x1="30" y1="125" x2="38" y2="145" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="38" y1="132" x2="46" y2="143" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="46" y1="132" x2="54" y2="138" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="54" y1="126" x2="62" y2="135" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="62" y1="119" x2="70" y2="137" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="70" y1="117" x2="78" y2="141" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="78" y1="123" x2="86" y2="145" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="86" y1="130" x2="94" y2="144" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="94" y1="133" x2="102" y2="139" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="102" y1="128" x2="110" y2="135" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="110" y1="121" x2="118" y2="136" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="118" y1="117" x2="126" y2="140" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="126" y1="121" x2="134" y2="144" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="134" y1="128" x2="142" y2="145" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="142" y1="133" x2="150" y2="141" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="150" y1="130" x2="158" y2="136" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="158" y1="123" x2="166" y2="135" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="166" y1="117" x2="174" y2="139" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="174" y1="119" x2="182" y2="143" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="182" y1="126" x2="190" y2="145" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="190" y1="132" x2="198" y2="142" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="198" y1="132" x2="206" y2="137" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="206" y1="125" x2="214" y2="135" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="214" y1="118" x2="222" y2="137" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="222" y1="118" x2="230" y2="142" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="230" y1="124" x2="238" y2="145" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="238" y1="131" x2="246" y2="143" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="246" y1="133" x2="254" y2="139" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="254" y1="127" x2="262" y2="135" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="262" y1="120" x2="270" y2="136" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="270" y1="117" x2="278" y2="141" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="278" y1="122" x2="286" y2="145" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="286" y1="129" x2="294" y2="144" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="294" y1="133" x2="302" y2="140" stroke="#654321" strokeWidth="3" opacity="0.7" />
      <line x1="302" y1="129" x2="310" y2="136" stroke="#654321" strokeWidth="3" opacity="0.7" />
      
      {/* Inner nest layers for depth */}
      <ellipse cx="160" cy="125" rx="110" ry="24" fill="#DEB887" opacity="0.6" />
      <ellipse cx="160" cy="120" rx="100" ry="20" fill="#F5DEB3" opacity="0.4" />
    </svg>
  )
}