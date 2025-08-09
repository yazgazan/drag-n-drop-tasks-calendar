import { Task, ScheduledTask } from '../types/task';
import { debugLogger } from './debugLogger';

interface TouchDragState {
  isDragging: boolean;
  draggedElement: HTMLElement | null;
  draggedTask: Task | ScheduledTask | null;
  ghostElement: HTMLElement | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

class TouchDragManager {
  private state: TouchDragState = {
    isDragging: false,
    draggedElement: null,
    draggedTask: null,
    ghostElement: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
  };

  private callbacks: {
    onDragStart?: (task: Task | ScheduledTask, element: HTMLElement) => void;
    onDragMove?: (x: number, y: number, task: Task | ScheduledTask) => void;
    onDragEnd?: (task: Task | ScheduledTask, dropTarget: HTMLElement | null) => void;
  } = {};

  private globalCallbacks: {
    onDragStart?: (task: Task | ScheduledTask, element: HTMLElement) => void;
    onDragMove?: (x: number, y: number, task: Task | ScheduledTask) => void;
    onDragEnd?: (task: Task | ScheduledTask, dropTarget: HTMLElement | null) => Promise<void> | void;
  } = {};

  setCallbacks(callbacks: typeof this.callbacks) {
    this.callbacks = callbacks;
  }

  setGlobalCallbacks(callbacks: typeof this.globalCallbacks) {
    debugLogger.info('TOUCH_DRAG', 'Setting global callbacks', {
      hasOnDragEnd: !!callbacks.onDragEnd,
      callbackType: typeof callbacks.onDragEnd
    });
    this.globalCallbacks = callbacks;
  }

  // Debug method to check callback status
  debugCallbackStatus() {
    debugLogger.info('TOUCH_DRAG', 'Current callback status', {
      hasLocalOnDragEnd: !!this.callbacks.onDragEnd,
      hasGlobalOnDragEnd: !!this.globalCallbacks.onDragEnd,
      localCallbackType: typeof this.callbacks.onDragEnd,
      globalCallbackType: typeof this.globalCallbacks.onDragEnd
    });
  }

  handleTouchStart = (e: TouchEvent, task: Task | ScheduledTask, element: HTMLElement) => {
    const touch = e.touches[0];
    const rect = element.getBoundingClientRect();
    
    debugLogger.info('TOUCH_DRAG', 'Touch start detected', {
      task: task.title,
      coordinates: { x: touch.clientX, y: touch.clientY },
      elementRect: rect
    });
    
    this.state = {
      isDragging: false, // Don't start dragging immediately
      draggedElement: element,
      draggedTask: task,
      ghostElement: null,
      startX: touch.clientX,
      startY: touch.clientY,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };

    // Add global touch listeners to detect movement
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd, { passive: false });
  };

  private handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.state.startX;
    const deltaY = touch.clientY - this.state.startY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Only start dragging if moved more than threshold (10px)
    if (!this.state.isDragging && distance > 10) {
      // Now we're actually starting to drag
      e.preventDefault();
      this.state.isDragging = true;
      
      debugLogger.info('TOUCH_DRAG', 'Drag threshold exceeded, starting drag', {
        task: this.state.draggedTask?.title,
        distance: distance,
        coordinates: { x: touch.clientX, y: touch.clientY }
      });
      
      // Create ghost element
      this.createGhostElement(this.state.draggedElement!, touch.clientX, touch.clientY);
      
      // Add visual feedback to original element
      if (this.state.draggedElement) {
        this.state.draggedElement.style.opacity = '0.5';
        this.state.draggedElement.classList.add('dragging');
      }
      
      // Call both local and global onDragStart callbacks
      this.callbacks.onDragStart?.(this.state.draggedTask!, this.state.draggedElement!);
      this.globalCallbacks.onDragStart?.(this.state.draggedTask!, this.state.draggedElement!);
    }
    
    if (this.state.isDragging && this.state.ghostElement) {
      e.preventDefault();
      
      // Update ghost element position
      this.state.ghostElement.style.left = `${touch.clientX - this.state.offsetX}px`;
      this.state.ghostElement.style.top = `${touch.clientY - this.state.offsetY}px`;
      
      // Highlight potential drop targets
      this.updateDropTargets(touch.clientX, touch.clientY);
      
      // Call both local and global onDragMove callbacks
      this.callbacks.onDragMove?.(touch.clientX, touch.clientY, this.state.draggedTask!);
      this.globalCallbacks.onDragMove?.(touch.clientX, touch.clientY, this.state.draggedTask!);
    }
  };

  private handleTouchEnd = async (e: TouchEvent) => {
    const wasDragging = this.state.isDragging;
    
    // Remove global listeners first
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
    
    if (!wasDragging) {
      // This was just a tap, reset state and allow normal click behavior
      this.state = {
        isDragging: false,
        draggedElement: null,
        draggedTask: null,
        ghostElement: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
      };
      return;
    }
    
    e.preventDefault();
    const touch = e.changedTouches[0];
    
    // Find drop target
    const dropTarget = this.getDropTarget(touch.clientX, touch.clientY);
    debugLogger.info('TOUCH_DRAG', 'Touch drag end', {
      task: this.state.draggedTask?.title,
      dropTarget: dropTarget?.className,
      dropTargetData: dropTarget ? {
        date: dropTarget.dataset.date,
        time: dropTarget.dataset.time
      } : null,
      coordinates: { x: touch.clientX, y: touch.clientY }
    });
    
    // Store references before cleanup
    const draggedTask = this.state.draggedTask;
    
    // Clean up
    this.cleanup();
    
    // Call both local and global onDragEnd callbacks
    debugLogger.info('TOUCH_DRAG', 'Calling callbacks', {
      hasLocalCallback: !!this.callbacks.onDragEnd,
      hasGlobalCallback: !!this.globalCallbacks.onDragEnd,
      hasTask: !!draggedTask,
      hasDropTarget: !!dropTarget,
      taskTitle: draggedTask?.title
    });
    
    // Call local callback first (for component-level handling)
    try {
      if (this.callbacks.onDragEnd) {
        debugLogger.info('TOUCH_DRAG', 'Calling local callback');
        this.callbacks.onDragEnd(draggedTask!, dropTarget);
        debugLogger.info('TOUCH_DRAG', 'Local callback completed');
      }
    } catch (error) {
      debugLogger.error('TOUCH_DRAG', 'Local callback failed', { error });
    }
    
    // Call global callback second (for app-level handling like actual dropping)
    try {
      if (this.globalCallbacks.onDragEnd) {
        debugLogger.info('TOUCH_DRAG', 'Calling global callback');
        await this.globalCallbacks.onDragEnd(draggedTask!, dropTarget);
        debugLogger.info('TOUCH_DRAG', 'Global callback completed');
      } else {
        debugLogger.warn('TOUCH_DRAG', 'No global callback registered');
      }
    } catch (error) {
      debugLogger.error('TOUCH_DRAG', 'Global callback failed', { error });
    }
  };

  private createGhostElement(originalElement: HTMLElement, x: number, y: number) {
    const ghost = originalElement.cloneNode(true) as HTMLElement;
    
    ghost.style.position = 'fixed';
    ghost.style.left = `${x - this.state.offsetX}px`;
    ghost.style.top = `${y - this.state.offsetY}px`;
    ghost.style.width = `${originalElement.offsetWidth}px`;
    ghost.style.height = `${originalElement.offsetHeight}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.opacity = '0.8';
    ghost.style.transform = 'rotate(5deg)';
    ghost.classList.add('touch-ghost');
    
    document.body.appendChild(ghost);
    this.state.ghostElement = ghost;
  }

  private updateDropTargets(x: number, y: number) {
    // Remove previous highlight
    document.querySelectorAll('.touch-drag-over').forEach(el => {
      el.classList.remove('touch-drag-over');
    });
    
    // Find current drop target and highlight it
    const dropTarget = this.getDropTarget(x, y);
    if (dropTarget) {
      dropTarget.classList.add('touch-drag-over');
    }
  }

  private getDropTarget(x: number, y: number): HTMLElement | null {
    // Temporarily hide ghost to get element underneath
    const ghost = this.state.ghostElement;
    if (ghost) ghost.style.display = 'none';
    
    const elementBelow = document.elementFromPoint(x, y) as HTMLElement;
    
    if (ghost) ghost.style.display = 'block';
    
    debugLogger.info('TOUCH_DRAG', 'Finding drop target', {
      coordinates: { x, y },
      elementBelow: elementBelow ? {
        tagName: elementBelow.tagName,
        className: elementBelow.className,
        id: elementBelow.id,
        dataDate: elementBelow.dataset.date,
        dataTime: elementBelow.dataset.time
      } : null
    });
    
    if (!elementBelow) {
      debugLogger.warn('TOUCH_DRAG', 'No element found at coordinates');
      return null;
    }
    
    // Find the actual drop zone (time slot or task list)
    // Also check if the element itself is a drop zone
    let dropZone = elementBelow.closest('.time-slot, .month-day, .unscheduled-drop-zone') as HTMLElement;
    
    // If element itself has the drop zone class, use it
    if (!dropZone && (elementBelow.classList.contains('time-slot') || 
                      elementBelow.classList.contains('month-day') || 
                      elementBelow.classList.contains('unscheduled-drop-zone'))) {
      dropZone = elementBelow;
    }
    
    // For time-slot, make sure it's not the time-label
    if (dropZone && dropZone.classList.contains('time-slot') && dropZone.classList.contains('time-label')) {
      debugLogger.warn('TOUCH_DRAG', 'Drop target is time-label, ignoring');
      return null;
    }
    
    debugLogger.info('TOUCH_DRAG', 'Drop target found', {
      dropZone: dropZone ? {
        tagName: dropZone.tagName,
        className: dropZone.className,
        id: dropZone.id,
        dataDate: dropZone.dataset.date,
        dataTime: dropZone.dataset.time
      } : null
    });
    
    return dropZone;
  }

  private cleanup() {
    // Remove ghost element
    if (this.state.ghostElement) {
      document.body.removeChild(this.state.ghostElement);
    }
    
    // Restore original element
    if (this.state.draggedElement) {
      this.state.draggedElement.style.opacity = '';
      this.state.draggedElement.classList.remove('dragging');
    }
    
    // Remove drop target highlights
    document.querySelectorAll('.touch-drag-over').forEach(el => {
      el.classList.remove('touch-drag-over');
    });
    
    // Reset state
    this.state = {
      isDragging: false,
      draggedElement: null,
      draggedTask: null,
      ghostElement: null,
      startX: 0,
      startY: 0,
      offsetX: 0,
      offsetY: 0,
    };
  }

  isDragging() {
    return this.state.isDragging;
  }

  getCurrentDraggedTask() {
    return this.state.draggedTask;
  }
}

// Create singleton instance
export const touchDragManager = new TouchDragManager();

// Utility function to add touch drag support to an element
export function addTouchDragSupport(
  element: HTMLElement,
  task: Task | ScheduledTask,
  callbacks: {
    onDragStart?: (task: Task | ScheduledTask, element: HTMLElement) => void;
    onDragEnd?: (task: Task | ScheduledTask, dropTarget: HTMLElement | null) => void;
  }
) {
  const handleTouchStart = (e: TouchEvent) => {
    touchDragManager.setCallbacks(callbacks);
    touchDragManager.handleTouchStart(e, task, element);
  };

  element.addEventListener('touchstart', handleTouchStart, { passive: false });
  
  // Return cleanup function
  return () => {
    element.removeEventListener('touchstart', handleTouchStart);
  };
}