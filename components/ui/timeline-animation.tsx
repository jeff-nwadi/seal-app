'use client';

import React, { useRef } from "react";
import { motion, useInView, type Variants } from "framer-motion";

interface TimelineContentProps {
  as?: React.ElementType;
  animationNum: number;
  timelineRef: React.RefObject<HTMLElement | null>;
  customVariants: Variants;
  className?: string;
  children?: React.ReactNode;
  [key: string]: any; // to support href, target, rel, etc. for 'as' elements
}

export function TimelineContent({
  as = "div",
  animationNum,
  timelineRef,
  customVariants,
  className,
  children,
  ...props
}: TimelineContentProps) {
  const localRef = useRef(null);
  // Trigger when container/element comes into view
  const isInView = useInView(timelineRef?.current ? timelineRef : localRef, {
    once: true,
    margin: "-50px 0px",
  });

  const MotionComponent = motion(as);

  return (
    <MotionComponent
      ref={localRef}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      custom={animationNum}
      variants={customVariants}
      className={className}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}
