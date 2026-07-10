const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const config = getDefaultConfig(__dirname)

// Le cœur partagé vit hors de mobile/ : Metro doit surveiller ce dossier et
// résoudre l'alias @core — même contrat que l'alias @core de app/vite.config.js.
// (extraNodeModules ne suffit pas : @core/ n'a pas de package.json, on réécrit
// donc la requête en chemin absolu avant de laisser Metro résoudre.)
const CORE = path.resolve(__dirname, '../core/src')
// Le dossier surveillé est la RACINE du dépôt (ancêtre commun de mobile/ et
// core/) — la forme officiellement supportée. On exclut le poids mort du web.
// SDK 57 : pendant `expo export`, le « on-demand filesystem » JETTE les
// watchFolders personnalisés (withMetroMultiPlatform.js) et core/ devient
// invisible (« Failed to get the SHA-1 »). Il est désactivé dans app.json
// (`expo.experiments.onDemandFilesystem: false`) — le flag est écrasé ici
// par instantiateMetro.js, inutile de le poser dans ce fichier.
config.watchFolders = [path.resolve(__dirname, '../core')]

const baseResolve = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@core/')) {
    return { type: 'sourceFile', filePath: path.join(CORE, moduleName.slice('@core/'.length)) }
  }
  return (baseResolve || context.resolveRequest)(context, moduleName, platform)
}

module.exports = config
