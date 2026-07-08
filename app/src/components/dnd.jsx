import { useDraggable, useDroppable } from '@dnd-kit/core'
import { Avatar } from './ui.jsx'

export function StudentChip({ student, overlay=false }){
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: student.id, data:{ student } })
  return (
    <button ref={setNodeRef} {...listeners} {...attributes}
      className={`no-select flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-line bg-white shadow-sm hover:shadow text-sm font-medium cursor-grab active:cursor-grabbing ${isDragging&&!overlay?'opacity-30':''} ${overlay?'shadow-xl scale-105':''}`}>
      <Avatar name={student.name} seed={student.id} size={28}/>
      {student.name}
    </button>
  )
}

export function DropZone({ id, children, className='', hot }){
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div ref={setNodeRef} className={`${className} ${isOver?'drop-hot':''}`}>{children}</div>
  )
}
