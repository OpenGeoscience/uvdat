// Important Note: This script does not apply auth to requests;
// To run this test, remove `GuardianPermission` from the `permission_classes`
// And remove `GuardianFilter` from the `filter_backends`
// On the `GenericDataViewSet` in `uvdat/core/rest/data.py`


const RASTERIDS = [29, 30, 31, 32, 33, 34, 35]
const AREA = [
  [74.1154, 43.1807],  // top-left
  [74.2382, 43.1807],  // top-right
  [74.2382, 43.0909],  // bottom-right
  [74.1154, 43.0909],  // bottom-left
]
;

const CancelledError = new Error('Cancelled')

// [min, max)
function randint(min, max) {
    const w = max - min
    return Math.floor(Math.random() * w + min)
}

function choice(arr) {
    const idx = Math.floor(Math.random() * arr.length)
    return arr[idx]
}

function deg2rad(d) {
    return d / 180 * Math.PI
}

function getLongRange(z, area) {
    const longvals = area.map((xy) => xy[0])
    const [lngmin, lngmax] = [Math.min(...longvals), Math.max(...longvals)]
    const lng2x = (lng) => Math.floor(1 / (2 * Math.PI) * (2**z) * (Math.PI + deg2rad(lng)))
    const xmin = lng2x(lngmin)
    const xmax = lng2x(lngmax)
    return [Math.min(xmin, xmax), Math.max(xmin, xmax)]
}

function getLatRange(z, area) {
    const latvals = area.map((xy) => xy[1])
    const [latmin, latmax] = [Math.min(...latvals), Math.max(...latvals)]
    const lat2y = (lat) => Math.floor(1 / (2 * Math.PI) * (2**z) * (Math.PI - Math.log(Math.tan(Math.PI / 4 + deg2rad(lat) / 2))))
    const ymin = lat2y(latmin)
    const ymax = lat2y(latmax)
    return [Math.min(ymin, ymax), Math.max(ymin, ymax)]
}

function doRequestWithTimeout(url, timeout, opts = {}) {
  const controller = new AbortController()
  const cancel = (reason = undefined) => {
    controller.abort(reason)
  };
  const promise = fetch(url, {
    ...opts,
    signal: controller.signal,
  });

  const timerId = setTimeout(() => {
    cancel(CancelledError)
  }, timeout ?? 0);

  promise
  .then((resp) => {
    return resp.arrayBuffer()
  })
  .catch((err) => {
    if (err !== CancelledError) throw err
  }).finally(() => {
    clearTimeout(timerId)
  });

  return promise;
}

async function worker(wid) {
    let cancelled = 0
    let requests = 0
    console.log(`Starting worker ${wid}`)
    while (true) {
        console.log(`[${wid}] Cancelled: ${cancelled} / ${requests}`)
        const timeout = Math.random() * 400
        const z = randint(12, 20)
        const x = randint(...getLongRange(z, AREA))
        const y = randint(...getLatRange(z, AREA))
        try {
            requests++
            await doRequestWithTimeout(`http://localhost:8000/api/v1/rasters/${choice(RASTERIDS)}/tiles/${z}/${x}/${y}.png/?projection=EPSG%3A3857&min=0&max=255`, timeout)
        } catch (err) {
            if (err === CancelledError) {
                cancelled++
            } else {
                console.error(err)
                throw err
            }
        }
    }
}

async function main() {
    const promises = []
    for (let i = 0; i < 1; i++) {
        promises.push(worker(i))
    }
    return Promise.allSettled(promises)
}

main();
