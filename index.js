d3.json('https://raw.githubusercontent.com/d3/d3-hierarchy/master/test/data/flare.json', (err, data) => {
    if (err) throw err
    console.log(data)
    createTreemap('#treemap', data)
})

function createTreemap(selector, JSONData, maxDepth = 1) {
    const margin = {
        top: 40,
        right: 10,
        bottom: 10,
        left: 10
    }
    const width = 960 - margin.left - margin.right
    const height = 960 - margin.top - margin.bottom
    const x = d3.scaleLinear().range([0, width])
    const y = d3.scaleLinear().range([0, height])

    const crumbs = d3.select('#crumbs')

    const scheme = ['#fbb4ae', '#b3cde3', '#ccebc5',
        '#decbe4', '#fed9a6', '#ffffcc', '#e5d8bd', '#fddaec'
    ]

    const color = d3.scaleOrdinal(scheme)
    const DiffTypeColor = d3.scaleOrdinal(d3.schemePastel2)
    const lum = d3.scaleLinear()
        .domain([0, 1e6])
        .clamp(true)
        .range([50, 75])

    const treemapDiv = d3.select(selector)
    const map = treemapDiv.append('svg')
        .attr('viewBox', '0 0 ' +
            (width + margin.left + margin.right) +
            ' ' +
            (height + margin.top + margin.bottom))
        .attr('preserveAspectRatio', 'xMidYMid meet')
        .attr('width', '100%')
        .attr('height', '100%')
        .append('g')
        .attr('transform', 'translate(' + margin.left + ', ' + margin.top + ')')

    const treemap = d3.treemap()
        .tile(d3.treemapResquarify)
        .size([width, height])
        .round(false)

    const root = d3.hierarchy(JSONData, (d) => d.children)
        .eachBefore((d) => {
            d.data.id = (d.parent && d.parent.depth !== 0 ? d.parent.data.id + ' ' : '') + d.data.name.replace(/ /g, '_')
        })
        .sum((d) => {
            return d.value ? 1 : 0
        })
        .sort((a, b) => {
            return b.height - a.height || b.value - a.value
        })

    d3.select('#location').on('click', () => {
        zoomOut(root)
        clearCrumbs()
    })
    treemap(root)
    let cell = map.selectAll('g')
        .data(root.descendants())
        .enter().append('g')
        .attr('transform', (d) => {
            return 'translate(' + d.x0 + ', ' + d.y0 + ')'
        })

    cell.append('rect')
        .on('click', (d) => {
            if (typeof d.children === 'undefined') {
                d.bottom = true
                zoomIn(d)
            }
            zoomIn(d)
        })
        .filter((d) => {
            return d.depth <= maxDepth
        })
        .attr('width', (d) => {
            return d.x1 - d.x0
        })
        .attr('height', (d) => {
            return d.y1 - d.y0
        })
        .attr('stroke', 'white')
        .attr('stroke-width', (d) => {
            return d.parent === root ? '6px' : '1px'
        })
        .attr('fill', (d) => {
            return fill(d)
        })
        .attr('opacity', (d) => {
            return d.depth < maxDepth ? 0 : 1
        })

    function zoomIn(focus) {
        let w = focus.x1 - focus.x0
        let h = focus.y1 - focus.y0
        let kx = width * 1.0 / w
        let ky = height * 1.0 / h
        x.domain([focus.x0, focus.x1])
        y.domain([focus.y0, focus.y1])
        let newTree = map.selectAll('g')
            .transition()
            .duration(500)
            .attr('transform', (d) => {
                return 'translate(' + x(d.x0) + ', ' + y(d.y0) + ')'
            })
        newTree.select('rect').filter((d) => {
                return d.depth <= maxDepth + focus.depth + 1
            })
            .attr('width', (d) => {
                return kx * (d.x1 - d.x0)
            })
            .attr('height', (d) => {
                return ky * (d.y1 - d.y0)
            })
            .attr('stroke', (d) => {
                let stroke = 'white'
                if (focus.bottom) {
                    stroke = 'black'
                }
                return stroke
            })
            .attr('stroke-width', (d) => {
                return d.depth < maxDepth + focus.depth && !focus.bottom ? '6px' : '1px'
            })
            .attr('fill', (d) => {
                return fill(d)
            })
            .attr('opacity', (d) => {
                return d.depth < maxDepth + focus.depth ? 1 : 0.3
            })
        d3.event.stopPropagation()
    }

    function zoomOut(d) {
        zoomIn(d)
        map.selectAll('g')
            .select('rect')
            .filter((d) => {
                return d.depth >= 3
            })
            .attr('width', (d) => {
                return 0
            })
            .attr('height', (d) => {
                return 0
            })
        clearDetails(d3.select('#details'))
    }

    function fill (treeNode) {
        let p = treeNode
        while (p.depth > 1) p = p.parent
        let c = d3.lab(color(p.data.id))
        if (treeNode.depth <= 2) {
            c.l = lum(JSON.parse(treeNode.descendants().length * (treeNode.y1 - treeNode.y0) * (treeNode.x1 - treeNode.x0)))
            treeNode.fill = c
        } else if (treeNode.parent && treeNode.parent.fill) {
            c = treeNode.parent.fill
            // c.l += Math.random()
            treeNode.fill = c
        }
        return c
    }
}
