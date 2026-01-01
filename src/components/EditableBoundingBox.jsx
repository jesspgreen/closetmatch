import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Move, Maximize2, Edit3, Check, X, GripVertical } from 'lucide-react';

/**
 * Editable bounding box that can be dragged and resized
 */
export default function EditableBoundingBox({
  item,
  isSelected,
  isEditing,
  onSelect,
  onUpdate,
  onStartEdit,
  onEndEdit,
  containerRef,
  color,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [boxStart, setBoxStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [editName, setEditName] = useState(item.name);
  
  const boxRef = useRef(null);

  const box = item.boundingBox || { x: 0, y: 0, width: 20, height: 20 };

  // Convert percentage to pixels based on container size
  const getContainerSize = useCallback(() => {
    if (!containerRef?.current) return { width: 100, height: 100 };
    const rect = containerRef.current.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }, [containerRef]);

  // Handle mouse/touch start for dragging
  const handleDragStart = (e) => {
    if (!isEditing) {
      onSelect();
      return;
    }
    
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setIsDragging(true);
    setDragStart({ x: clientX, y: clientY });
    setBoxStart({ x: box.x, y: box.y, width: box.width, height: box.height });
  };

  // Handle resize start
  const handleResizeStart = (e, handle) => {
    if (!isEditing) return;
    
    e.stopPropagation();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart({ x: clientX, y: clientY });
    setBoxStart({ x: box.x, y: box.y, width: box.width, height: box.height });
  };

  // Handle mouse/touch move
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const container = getContainerSize();
      
      const deltaXPercent = ((clientX - dragStart.x) / container.width) * 100;
      const deltaYPercent = ((clientY - dragStart.y) / container.height) * 100;

      if (isDragging) {
        // Move the box
        let newX = boxStart.x + deltaXPercent;
        let newY = boxStart.y + deltaYPercent;
        
        // Constrain to container
        newX = Math.max(0, Math.min(100 - box.width, newX));
        newY = Math.max(0, Math.min(100 - box.height, newY));
        
        onUpdate({
          ...item,
          boundingBox: { ...box, x: newX, y: newY }
        });
      } else if (isResizing) {
        // Resize the box
        let newBox = { ...boxStart };
        const minSize = 5; // Minimum 5% size
        
        switch (resizeHandle) {
          case 'nw':
            newBox.x = Math.min(boxStart.x + boxStart.width - minSize, boxStart.x + deltaXPercent);
            newBox.y = Math.min(boxStart.y + boxStart.height - minSize, boxStart.y + deltaYPercent);
            newBox.width = boxStart.width - (newBox.x - boxStart.x);
            newBox.height = boxStart.height - (newBox.y - boxStart.y);
            break;
          case 'ne':
            newBox.y = Math.min(boxStart.y + boxStart.height - minSize, boxStart.y + deltaYPercent);
            newBox.width = Math.max(minSize, boxStart.width + deltaXPercent);
            newBox.height = boxStart.height - (newBox.y - boxStart.y);
            break;
          case 'sw':
            newBox.x = Math.min(boxStart.x + boxStart.width - minSize, boxStart.x + deltaXPercent);
            newBox.width = boxStart.width - (newBox.x - boxStart.x);
            newBox.height = Math.max(minSize, boxStart.height + deltaYPercent);
            break;
          case 'se':
            newBox.width = Math.max(minSize, boxStart.width + deltaXPercent);
            newBox.height = Math.max(minSize, boxStart.height + deltaYPercent);
            break;
          case 'n':
            newBox.y = Math.min(boxStart.y + boxStart.height - minSize, boxStart.y + deltaYPercent);
            newBox.height = boxStart.height - (newBox.y - boxStart.y);
            break;
          case 's':
            newBox.height = Math.max(minSize, boxStart.height + deltaYPercent);
            break;
          case 'w':
            newBox.x = Math.min(boxStart.x + boxStart.width - minSize, boxStart.x + deltaXPercent);
            newBox.width = boxStart.width - (newBox.x - boxStart.x);
            break;
          case 'e':
            newBox.width = Math.max(minSize, boxStart.width + deltaXPercent);
            break;
        }
        
        // Constrain to container
        newBox.x = Math.max(0, newBox.x);
        newBox.y = Math.max(0, newBox.y);
        if (newBox.x + newBox.width > 100) newBox.width = 100 - newBox.x;
        if (newBox.y + newBox.height > 100) newBox.height = 100 - newBox.y;
        
        onUpdate({
          ...item,
          boundingBox: newBox
        });
      }
    };

    const handleEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeHandle(null);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, isResizing, dragStart, boxStart, resizeHandle, box, item, onUpdate, getContainerSize]);

  // Save name edit
  const saveName = () => {
    onUpdate({ ...item, name: editName });
    onEndEdit();
  };

  // Cancel name edit
  const cancelEdit = () => {
    setEditName(item.name);
    onEndEdit();
  };

  const borderColor = isSelected ? '#22c55e' : color.border;
  const bgColor = isSelected ? 'rgba(34, 197, 94, 0.2)' : color.bg;

  return (
    <div
      ref={boxRef}
      className="absolute"
      style={{
        left: `${box.x}%`,
        top: `${box.y}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
      }}
    >
      {/* Main box */}
      <div
        className={`absolute inset-0 border-2 rounded cursor-pointer transition-all ${
          isDragging || isResizing ? 'opacity-80' : ''
        }`}
        style={{
          borderColor,
          backgroundColor: bgColor,
          borderWidth: isEditing ? 3 : 2,
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        {/* Drag handle (center) - only in edit mode */}
        {isEditing && isSelected && (
          <div 
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center cursor-move shadow-lg"
            onMouseDown={handleDragStart}
            onTouchStart={handleDragStart}
          >
            <Move size={16} className="text-stone-700" />
          </div>
        )}
      </div>

      {/* Resize handles - only in edit mode when selected */}
      {isEditing && isSelected && (
        <>
          {/* Corner handles */}
          {['nw', 'ne', 'sw', 'se'].map((handle) => (
            <div
              key={handle}
              className={`absolute w-4 h-4 bg-white border-2 rounded-full cursor-${handle}-resize shadow-md z-10`}
              style={{
                borderColor,
                top: handle.includes('n') ? -8 : 'auto',
                bottom: handle.includes('s') ? -8 : 'auto',
                left: handle.includes('w') ? -8 : 'auto',
                right: handle.includes('e') ? -8 : 'auto',
              }}
              onMouseDown={(e) => handleResizeStart(e, handle)}
              onTouchStart={(e) => handleResizeStart(e, handle)}
            />
          ))}
          
          {/* Edge handles */}
          {['n', 's', 'e', 'w'].map((handle) => (
            <div
              key={handle}
              className={`absolute bg-white border-2 rounded-full shadow-md z-10 ${
                handle === 'n' || handle === 's' ? 'w-6 h-3 cursor-ns-resize' : 'w-3 h-6 cursor-ew-resize'
              }`}
              style={{
                borderColor,
                top: handle === 'n' ? -6 : handle === 's' ? 'auto' : '50%',
                bottom: handle === 's' ? -6 : 'auto',
                left: handle === 'w' ? -6 : handle === 'e' ? 'auto' : '50%',
                right: handle === 'e' ? -6 : 'auto',
                transform: (handle === 'n' || handle === 's') ? 'translateX(-50%)' : 'translateY(-50%)',
              }}
              onMouseDown={(e) => handleResizeStart(e, handle)}
              onTouchStart={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}

      {/* Label */}
      {!isEditing ? (
        <div
          className="absolute -top-7 left-0 px-2 py-1 rounded text-xs font-medium text-white truncate max-w-full"
          style={{ backgroundColor: borderColor }}
        >
          {item.name.substring(0, 25)}{item.name.length > 25 ? '...' : ''}
        </div>
      ) : isSelected ? (
        <div className="absolute -top-10 left-0 right-0 flex items-center gap-1">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-white text-stone-800 rounded border-2 focus:outline-none min-w-0"
            style={{ borderColor }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') cancelEdit();
            }}
            autoFocus
          />
          <button
            onClick={(e) => { e.stopPropagation(); saveName(); }}
            className="w-6 h-6 bg-green-500 rounded flex items-center justify-center"
          >
            <Check size={14} className="text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); cancelEdit(); }}
            className="w-6 h-6 bg-red-500 rounded flex items-center justify-center"
          >
            <X size={14} className="text-white" />
          </button>
        </div>
      ) : (
        <div
          className="absolute -top-7 left-0 px-2 py-1 rounded text-xs font-medium text-white truncate max-w-full cursor-pointer"
          style={{ backgroundColor: borderColor }}
          onClick={(e) => { e.stopPropagation(); onSelect(); onStartEdit(); }}
        >
          {item.name.substring(0, 25)}{item.name.length > 25 ? '...' : ''}
          <Edit3 size={10} className="inline ml-1" />
        </div>
      )}

      {/* Selection indicator */}
      {isSelected && (
        <div 
          className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-lg"
        >
          <Check size={14} className="text-white" />
        </div>
      )}
    </div>
  );
}
