import React from "react";
import BookPanel from "./BookPanel";
import TeachingPanel from "./TeachingPanel";
import DevotionalPanel from "./DevotionalPanel";
import StudyPanel from "./StudyPanel";
import SermonPanel from "./SermonPanel";
import VideoPanel from "./VideoPanel";

const RightPanel = ({ projectType, section, wordCount, project, projectStyle, onSectionUpdate, onStyleChange, onResourceChange }) => {
  return (
    <div className="h-full">
      {(projectType === "book" || projectType === "libro") && (
        <BookPanel section={section} project={project} projectStyle={projectStyle} onSectionUpdate={onSectionUpdate} onStyleChange={onStyleChange} onResourceChange={onResourceChange} />
      )}
      {(projectType === "teaching" || projectType === "ensenanza") && (
        <TeachingPanel section={section} project={project} onResourceChange={onResourceChange} />
      )}
      {(projectType === "devotional" || projectType === "devocional") && (
        <DevotionalPanel
          section={section}
          wordCount={wordCount}
          project={project}
          onResourceChange={onResourceChange}
        />
      )}
      {(projectType === "study" || projectType === "estudio") && (
        <StudyPanel section={section} project={project} onResourceChange={onResourceChange} />
      )}
      {(projectType === "sermon") && (
        <SermonPanel section={section} project={project} onResourceChange={onResourceChange} />
      )}
      {(projectType === "video") && (
        <VideoPanel section={section} project={project} onResourceChange={onResourceChange} />
      )}
    </div>
  );
};

export default RightPanel;
