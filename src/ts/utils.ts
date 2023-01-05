/////////////////////////////////////////////////////////////////////////////
// Get ancestor matching a selector
function ancestor(descendant: HTMLElement, selector: string) {
    while (descendant && !descendant.matches(selector))
            descendant = descendant.parentElement
    return descendant
}

export { ancestor }