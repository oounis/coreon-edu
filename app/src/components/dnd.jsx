import { useDraggable, useDroppable } from '@dnd-kit/core'
import { studentColor } from '../data.js'
import { resolveStudentAvatar, avatarBg } from '../people.js'

export function StudentChip({ student, overlay=false }){
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: student.id, data:{ student } })
  const col = studentColor(student.id)
  return (
    <button ref={setNodeRef} {...listeners} {...attributes}
      className={`no-select flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-line bg-white shadow-sm hover:shadow text-sm font-medium cursor-grab active:cursor-grabbing ${isDragging&&!overlay?'opacity-30':''} ${overlay?'shadow-xl scale-105':''}`}>
      <span className="w-7 h-7 rounded-full overflow-hidden grid place-items-center shrink-0" style={{background:avatarBg(student.id),boxShadow:`0 0 0 2px ${col}`}}>
        <img src={resolveStudentAvatar(student)} alt="" className="w-full h-full object-contain"/>
      </span>
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
