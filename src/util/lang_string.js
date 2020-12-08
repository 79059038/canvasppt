/**
 * 将横线式命名转为驼峰式
 * @param {Stirng} string 
 */
export function camelize(string) {
    return string.replace(/-+(.)?/g, function(match, character) {
        return character ? character.toUpperCase() : '';
      });
}