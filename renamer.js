const fs = require('fs');
const options = require('./options.json')

const getAllFilenames = async(dir) => {
    const filenames = []
    fs.readdirSync(dir).forEach(async filename => {
        if (filename !== 'renamer') {
            filenames.push(filename)
        }
    });
    return filenames
}

const getMatch = (filenames, matchStr, fullname = false, ext = '') => {
    const regexpMatchStr = new RegExp((fullname) ? `^${matchStr}${ext}$` : matchStr)
    const result = filenames.filter(filename => filename.match(regexpMatchStr)) || []
    console.log({ regexpMatchStr, matchStr, result })
    return result
}

const renameFile = async(dir, oldFilename, newFilename) => {
    await fs.renameSync(`${dir}${oldFilename}`, `${dir}${newFilename}`);
}

const createRenameConfig = async(dir, key, matchStr, newStr, matchOptions) => {
    const filenames = await getAllFilenames(dir)
    console.log(filenames)
    const matchCallOptions = {
        "s": { matchConstructor: (str) => `${str}${key}` },
        "m": { matchConstructor: (str) => `${key}${str}${key}` },
        "e": { matchConstructor: (str) => `${key}${str}` },
        "f": { matchConstructor: (str) => `${str}`, args: [true, '.jpg'] }
    }
    const filenamesToChangeConfig = {}
    let usedFilenames = []
        // console.log({ matchOptions })
    for (let sign in matchCallOptions) {
        if (!matchOptions.find(el => el === `-${sign}`)) {
            let options = matchCallOptions[sign]
            let args = options.args || []
            let matchProperStr = options.matchConstructor(matchStr)
            let matchedFilenames = getMatch(filenames, matchProperStr, ...args)
            let filenamesToChange = matchedFilenames.filter(el => usedFilenames.indexOf(el) === -1)
            console.log({ matchedFilenames, filenamesToChange, usedFilenames })
            filenamesToChangeConfig[matchProperStr] = {
                filenames: filenamesToChange,
                matchConstructor: options.matchConstructor
            }
            usedFilenames = [...usedFilenames, ...filenamesToChange]
        }
    }
    const renameConfig = {
        newStr,
        dir,
        filenamesToChangeConfig
    }
    return renameConfig
}

const renameByConfig = async(renameConfig) => {

    const { newStr, dir, filenamesToChangeConfig } = renameConfig
    // console.log({ filenamesToChangeConfig })
    for (matchProperStr in filenamesToChangeConfig) {
        let matchConfig = filenamesToChangeConfig[matchProperStr]
        let { filenames, matchConstructor } = matchConfig
        for (let filename of filenames) {
            let newFilename = filename.replace(matchProperStr, matchConstructor(newStr))
            console.log({ newFilename })
            await renameFile(dir, filename, newFilename)
        }
    }
}

const renameMatched = async(dir, key, matchStr, newStr, matchOptions) => {


    const renameConfig = await createRenameConfig(dir, key, matchStr, newStr, matchOptions)
    await renameByConfig(renameConfig)
}

const renameChainWithOpts = async(options) => {

    const { changeParams, dir } = options
    for (let key in changeParams) {
        for (let param in changeParams[key]) {
            renameParams = [changeParams[key][param]].flat(2)
            const value = renameParams[0]
            const match = renameParams[1] || ''
            const matchOptions = match.split(' ')
            await renameMatched(dir, key, param, value, matchOptions)
        }
    }

}

const main = async(options) => {

    await renameChainWithOpts(options)
}

(new Promise(async(resolve, reject) => { await main(options) }))