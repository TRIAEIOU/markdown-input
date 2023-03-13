/** Get closest ancestor matching supplied selector */
function ancestor(descendant: HTMLElement, selector: string) {
    while (descendant && !descendant.matches(selector))
            descendant = descendant.parentElement
    return descendant
}

export { ancestor }