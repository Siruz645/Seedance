'use client';

import React from 'react';
import { ShotCard } from './ShotCard';
import { Scene } from '@/types/studio';
import { useStudioStore } from '@/lib/projectStore';

interface Props {
  scene: Scene;
  sceneIndex: number;
  isFirst?: boolean;
  isLast?: boolean;
}

export const SceneCard: React.FC<Props> = ({ scene, sceneIndex }) => {
  const { activeSceneId, sceneGroups } = useStudioStore();
  const activeGroup = sceneGroups.find((g) => g.id === activeSceneId) || sceneGroups[0];

  return (
    <ShotCard
      sceneId={activeGroup?.id || 'default_scene'}
      shot={scene}
      shotIndex={sceneIndex}
      totalShots={activeGroup?.shots.length || 1}
    />
  );
};
