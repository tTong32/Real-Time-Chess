import React from 'react';
import { BoardEditor } from '../components/BoardEditor';
import { ProtectedRoute } from '../components/ProtectedRoute';

export const BoardEditorPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <BoardEditor />
    </ProtectedRoute>
  );
};

