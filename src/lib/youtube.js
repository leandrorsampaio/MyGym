/** YouTube URL helpers — handle both Shorts and regular watch?v= links. */
export function youtubeId(url) {
    try {
        const u = new URL(url);
        // youtu.be/<id>
        if (u.hostname === 'youtu.be')
            return u.pathname.slice(1) || null;
        // /shorts/<id>
        const shorts = u.pathname.match(/\/shorts\/([\w-]+)/);
        if (shorts)
            return shorts[1];
        // /embed/<id>
        const embed = u.pathname.match(/\/embed\/([\w-]+)/);
        if (embed)
            return embed[1];
        // watch?v=<id>
        const v = u.searchParams.get('v');
        if (v)
            return v;
        return null;
    }
    catch {
        return null;
    }
}
export function embedUrl(url) {
    const id = youtubeId(url);
    return id ? `https://www.youtube.com/embed/${id}?playsinline=1&rel=0` : null;
}
