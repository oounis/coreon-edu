// Modules (/modules) — tout ce que le produit fait, les règles, les portails.
import { ModulesGrid, Rules, Portals, Cta } from './shared.jsx'

export default function ModulesPage(){
  return (
    <>
      <ModulesGrid/>
      <Rules/>
      <Portals/>
      <Cta/>
    </>
  )
}
