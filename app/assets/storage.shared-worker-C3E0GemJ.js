(function() {
	function t() {
		const t = navigator.storageBuckets;
		if (!t || "function" != typeof t.open) throw new Error("Storage Buckets API is not available");
		return t;
	}
	function e(t, e, r) {
		return {
			kind: "bucket",
			profileId: e,
			originScope: r,
			caches: t.caches,
			indexedDB: t.indexedDB,
			getDirectory() {
				return t.getDirectory();
			}
		};
	}
	async function r(t, e) {
		let r = t;
		for (const t of e) r = await r.getDirectoryHandle(t, { create: !0 });
		return r;
	}
	function o(t, e, r) {
		return {
			kind: "opfs-subdir",
			profileId: e,
			originScope: r,
			caches: void 0,
			indexedDB: void 0,
			async getDirectory() {
				return t;
			}
		};
	}
	function i(t, e) {
		return "/" === t ? `/${e}` : `${t}/${e}`;
	}
	async function n(t, e) {
		return r = t.transaction(b, "readonly").objectStore(b).get(e), new Promise((t, e) => {
			r.onsuccess = () => t(r.result), r.onerror = () => e(r.error ?? /* @__PURE__ */ new Error("shim: request failed"));
		});
		var r;
	}
	async function a(t, e, r) {
		const o = t.transaction(b, "readwrite");
		return o.objectStore(b).put(r, e), new Promise((t, e) => {
			o.oncomplete = () => t(), o.onerror = () => e(o.error ?? /* @__PURE__ */ new Error("shim: put failed"));
		});
	}
	async function s(t, e) {
		const r = t.transaction(b, "readwrite"), o = r.objectStore(b), i = IDBKeyRange.bound(e, `${e}￿`);
		return o.delete(i), new Promise((t, e) => {
			r.oncomplete = () => t(), r.onerror = () => e(r.error ?? /* @__PURE__ */ new Error("shim: deleteRange failed"));
		});
	}
	function c(t, e, r) {
		return {
			kind: "directory",
			name: r,
			async getFileHandle(r, o) {
				const s = i(e, r);
				if (!await n(t, s)) {
					if (!o?.create) {
						const t = /* @__PURE__ */ new Error(`NotFoundError: ${r}`);
						throw t.name = "NotFoundError", t;
					}
					await a(t, s, {
						kind: "file",
						content: ""
					});
				}
				return function(t, e, r) {
					return {
						kind: "file",
						name: r,
						async getFile() {
							const o = await n(t, e);
							if (!o || "file" !== o.kind) {
								const t = /* @__PURE__ */ new Error(`NotFoundError: ${r}`);
								throw t.name = "NotFoundError", t;
							}
							return {
								size: o.content.length,
								async text() {
									return o.content;
								}
							};
						},
						async createWritable() {
							let r = "", o = !1;
							return {
								async write(t) {
									"string" == typeof t ? r += t : t instanceof Blob ? r += await t.text() : t instanceof ArrayBuffer && (r += new TextDecoder().decode(t));
								},
								async close() {
									o || (o = !0, await a(t, e, {
										kind: "file",
										content: r
									}));
								},
								async abort() {
									o = !0;
								}
							};
						}
					};
				}(t, s, r);
			},
			async getDirectoryHandle(r, o) {
				const s = i(e, r);
				if (!await n(t, s)) {
					if (!o?.create) {
						const t = /* @__PURE__ */ new Error(`NotFoundError: ${r}`);
						throw t.name = "NotFoundError", t;
					}
					await a(t, s, { kind: "dir" });
				}
				return c(t, s, r);
			},
			async removeEntry(r, o) {
				const n = i(e, r);
				if (o?.recursive) await s(t, n);
				else {
					const e = t.transaction(b, "readwrite");
					e.objectStore(b).delete(n), await new Promise((t, r) => {
						e.oncomplete = () => t(), e.onerror = () => r(e.error ?? /* @__PURE__ */ new Error("shim: remove failed"));
					});
				}
			}
		};
	}
	function l() {
		try {
			const t = globalThis.__DAYDREAM_BUCKET_KEY__;
			if ("string" == typeof t && t.length > 0) return t;
		} catch {}
		return k;
	}
	async function f(...t) {
		const e = "undefined" != typeof location && location?.origin ? location.origin : "", r = new TextEncoder().encode([
			e,
			l(),
			...t
		].join(String.fromCharCode(0))), o = await crypto.subtle.digest("SHA-256", r);
		return Array.from(new Uint8Array(o), (t) => t.toString(16).padStart(2, "0")).join("").slice(0, 56);
	}
	async function u() {
		if ("undefined" == typeof navigator) return;
		const t = navigator.storage;
		if (t?.persist) try {
			if (t.persisted && await t.persisted()) return;
			await t.persist();
		} catch {}
	}
	function d(t) {
		return A.has(t);
	}
	function w(t) {
		return "object" == typeof t && null !== t && !Array.isArray(t);
	}
	function h(t) {
		if (void 0 !== t) try {
			const e = JSON.stringify(t);
			if (void 0 === e) return;
			return JSON.parse(e);
		} catch {
			return;
		}
	}
	function p(t) {
		let e = x.get(t);
		if (!e) {
			const r = M.then(async (e) => function(t) {
				const e = (t) => t.split("/").filter(Boolean), r = async (e, r) => {
					let o = await t;
					for (const t of e) o = await o.getDirectoryHandle(t, { create: r });
					return o;
				}, o = (t) => t?.name ?? "", i = (t) => "NotFoundError" === o(t), n = (t) => "TypeMismatchError" === o(t);
				return {
					async exists(t) {
						const o = e(t);
						if (0 === o.length) return !0;
						const a = o.slice(0, -1), s = o[o.length - 1];
						try {
							const t = await r(a, !1);
							try {
								return await t.getFileHandle(s), !0;
							} catch (t) {
								if (!i(t)) {
									if (n(t)) return !0;
									throw t;
								}
							}
							try {
								return await t.getDirectoryHandle(s), !0;
							} catch (t) {
								if (i(t)) return !1;
								if (n(t)) return !0;
								throw t;
							}
						} catch (t) {
							if (i(t)) return !1;
							if (n(t)) return !1;
							throw t;
						}
					},
					async mkdir(t) {
						await r(e(t), !0);
					},
					async readFile(t) {
						const o = e(t);
						return (await (await (await r(o.slice(0, -1), !1)).getFileHandle(o[o.length - 1])).getFile()).text();
					},
					async writeFile(t, o) {
						const i = e(t), n = await (await r(i.slice(0, -1), !0)).getFileHandle(i[i.length - 1], { create: !0 });
						let a, s = 0;
						for (;;) try {
							a = await n.createWritable();
							break;
						} catch (t) {
							const e = t?.name ?? "";
							if ("NoModificationAllowedError" !== e && "InvalidStateError" !== e || s >= 6) throw t;
							const r = Math.min(2 ** s * 8 + Math.floor(8 * Math.random()), 200);
							s++, await new Promise((t) => setTimeout(t, r));
						}
						try {
							await a.write(o), await a.close();
						} catch (t) {
							try {
								await a.abort();
							} catch {}
							throw t;
						}
					}
				};
			}((await e.getProfileRoot(t)).getDirectory()));
			r.catch(() => {}), e = new N(r, null, t), x.set(t, e);
		}
		return e;
	}
	function y(t) {
		const e = t instanceof Error ? t.message : String(t), r = t?.name;
		return r && B.has(r) || /\bstorage\b|\bfilesystem\b|\bopfs\b|\bbucket\b|opendb|unsafe for access|too many calls/i.test(e) ? {
			message: e,
			kind: "transport"
		} : {
			message: e,
			kind: "service"
		};
	}
	var g, m, b, R, k, v, P = Object.defineProperty, E = (t, e) => () => (t && (e = t(t = 0)), e), S = (t, e) => {
		let r = {};
		for (var o in t) P(r, o, {
			get: t[o],
			enumerable: !0
		});
		return e || P(r, Symbol.toStringTag, { value: "Module" }), r;
	}, D = S({ BucketProfileStorage() {
		return g;
	} }), _ = E(() => {
		I(), g = class {
			kind = "bucket";
			profileRoots = /* @__PURE__ */ new Map();
			originRoots = /* @__PURE__ */ new Map();
			appRoot;
			getAppRoot() {
				return this.appRoot ??= (async () => {
					const r = t(), o = await f("app");
					return e(await r.open(o), "__app__");
				})(), this.appRoot;
			}
			getProfileRoot(r) {
				let o = this.profileRoots.get(r);
				return o || (o = (async () => {
					const o = t(), i = await f("profile", r);
					return e(await o.open(i), r);
				})(), this.profileRoots.set(r, o)), o;
			}
			getOriginRoot(r, o) {
				const i = `${r}\0${o}`;
				let n = this.originRoots.get(i);
				return n || (n = (async () => {
					const i = t(), n = await f("site", r, o);
					return e(await i.open(n), r, o);
				})(), this.originRoots.set(i, n)), n;
			}
			async destroyProfile(e) {
				const r = t(), o = await f("profile", e);
				this.profileRoots.delete(e);
				for (const t of Array.from(this.originRoots.keys())) t.startsWith(`${e}\0`) && this.originRoots.delete(t);
				r.delete && await r.delete(o).catch(() => {});
			}
			async listPhysicalProfiles() {
				return [];
			}
		};
	}), $ = S({ OpfsSubdirProfileStorage() {
		return m;
	} }), O = E(() => {
		I(), m = class {
			kind = "opfs-subdir";
			profileRoots = /* @__PURE__ */ new Map();
			originRoots = /* @__PURE__ */ new Map();
			appRoot;
			rootHandle;
			getRoot() {
				return this.rootHandle ??= navigator.storage.getDirectory(), this.rootHandle;
			}
			getAppRoot() {
				return this.appRoot ??= (async () => o(await r(await this.getRoot(), ["app"]), "__app__"))(), this.appRoot;
			}
			getProfileRoot(t) {
				let e = this.profileRoots.get(t);
				return e || (e = (async () => o(await r(await this.getRoot(), ["profiles", await f("profile", t)]), t))(), this.profileRoots.set(t, e)), e;
			}
			getOriginRoot(t, e) {
				const i = `${t}\0${e}`;
				let n = this.originRoots.get(i);
				return n || (n = (async () => o(await r(await this.getRoot(), [
					"profiles",
					await f("profile", t),
					"sites",
					await f("site", e)
				]), t, e))(), this.originRoots.set(i, n)), n;
			}
			async destroyProfile(t) {
				const e = await this.getRoot(), o = await f("profile", t);
				this.profileRoots.delete(t);
				for (const e of Array.from(this.originRoots.keys())) e.startsWith(`${t}\0`) && this.originRoots.delete(e);
				try {
					await async function(t, e) {
						try {
							await t.removeEntry(e, { recursive: !0 });
						} catch (t) {
							if ("NotFoundError" !== t?.name) throw t;
						}
					}(await r(e, ["profiles"]), o);
				} catch (t) {
					console.warn("[opfsSubdir] destroyProfile failed", t);
				}
			}
			async listPhysicalProfiles() {
				return [];
			}
		};
	}), F = S({ IdbShimProfileStorage() {
		return R;
	} }), j = E(() => {
		b = "files", R = class {
			kind = "idb-shim";
			profileRoots = /* @__PURE__ */ new Map();
			originRoots = /* @__PURE__ */ new Map();
			appRoot;
			db;
			getDb() {
				return this.db ??= new Promise((t, e) => {
					const r = indexedDB.open("daydream_storage_shim", 1);
					r.onupgradeneeded = () => {
						const t = r.result;
						t.objectStoreNames.contains(b) || t.createObjectStore(b);
					}, r.onsuccess = () => t(r.result), r.onerror = () => e(r.error ?? /* @__PURE__ */ new Error("shim: openDb failed"));
				}), this.db;
			}
			async makeRoot(t, e, r) {
				const o = await this.getDb();
				await n(o, t) || await a(o, t, { kind: "dir" });
				const i = c(o, t, t);
				return {
					kind: "idb-shim",
					profileId: e,
					originScope: r,
					caches: void 0,
					indexedDB: void 0,
					async getDirectory() {
						return i;
					}
				};
			}
			getAppRoot() {
				return this.appRoot ??= this.makeRoot("/app", "__app__"), this.appRoot;
			}
			getProfileRoot(t) {
				let e = this.profileRoots.get(t);
				return e || (e = this.makeRoot(`/profiles/${t}`, t), this.profileRoots.set(t, e)), e;
			}
			getOriginRoot(t, e) {
				const r = `${t}\0${e}`;
				let o = this.originRoots.get(r);
				if (!o) {
					const i = encodeURIComponent(e);
					o = this.makeRoot(`/profiles/${t}/sites/${i}`, t, e), this.originRoots.set(r, o);
				}
				return o;
			}
			async destroyProfile(t) {
				const e = await this.getDb();
				this.profileRoots.delete(t);
				for (const e of Array.from(this.originRoots.keys())) e.startsWith(`${t}\0`) && this.originRoots.delete(e);
				await s(e, `/profiles/${t}`);
			}
			async listPhysicalProfiles() {
				return [];
			}
		};
	}), I = E(() => {
		k = "36f11d8095a74ce28b6304f9e217c5aa";
	});
	const A = new Set([
		"__proto__",
		"constructor",
		"prototype"
	]);
	var N = class {
		queue = Promise.resolve();
		initializedFiles = /* @__PURE__ */ new Set();
		profileId;
		constructor(t, e = function() {
			if ("undefined" == typeof navigator || !navigator.locks) throw new Error("Web Locks API is required for storage");
			return { request: (t, e) => new Promise((r, o) => {
				navigator.locks.request(t, async () => {
					try {
						r(await e());
					} catch (t) {
						o(t);
					}
				}).catch(o);
			}) };
		}(), r = "__default__") {
			this.fileSystem = t, this.locks = e, this.profileId = r;
		}
		execute(t) {
			if ("health" === t.operation) return Promise.resolve("ready");
			const e = async () => {
				const e = await this.fileSystem;
				return await this.ensureFile(e, t.folderPath, t.filePath), this.executeNow(e, t);
			}, r = this.queue.then(() => this.locks ? this.locks.request(`daydream-storage:${this.profileId}:${t.filePath}`, e) : e());
			return this.queue = r.then(() => {}, () => {}), r;
		}
		async executeNow(t, e) {
			if ("clear" === e.operation) return void await this.writeData(t, e.filePath, Object.create(null));
			const r = await this.readData(t, e.filePath);
			if ("keys" === e.operation) return Object.keys(r);
			const o = e.key;
			if (void 0 === o) throw new Error(`${e.operation} requires a key`);
			if (d(o)) throw new Error(`Storage key '${o}' is reserved and cannot be used`);
			if ("getItem" === e.operation) return Object.prototype.hasOwnProperty.call(r, o) ? r[o] : null;
			if ("mergeItem" === e.operation) {
				const i = Object.prototype.hasOwnProperty.call(r, o) ? r[o] : void 0, n = e.value;
				if (!w(n)) throw new Error("mergeItem requires an object value");
				const a = h({
					...w(i) ? i : {},
					...n
				});
				return r[o] = a, await this.writeData(t, e.filePath, r), a;
			}
			if ("setItem" === e.operation) {
				const i = h(e.value);
				return r[o] = i, await this.writeData(t, e.filePath, r), i;
			}
			Object.prototype.hasOwnProperty.call(r, o) && delete r[o], await this.writeData(t, e.filePath, r);
		}
		async ensureFile(t, e, r) {
			if (this.initializedFiles.has(r)) return;
			const o = async () => {
				e && !await t.exists(e) && await t.mkdir(e);
			};
			this.locks ? await this.locks.request(`daydream-storage-folder:${this.profileId}:${e}`, o) : await o(), await t.exists(r) || await this.writeData(t, r, Object.create(null)), this.initializedFiles.add(r);
		}
		async readData(t, e) {
			let r;
			try {
				r = await t.readFile(e);
			} catch {
				r = "{}";
			}
			try {
				const t = JSON.parse(r || "{}");
				if (w(t)) {
					const e = Object.create(null);
					for (const r of Object.keys(t)) d(r) || (e[r] = t[r]);
					return e;
				}
			} catch {}
			return await this.writeData(t, e, Object.create(null)), Object.create(null);
		}
		async writeData(t, e, r) {
			const o = {};
			for (const t of Object.keys(r)) d(t) || (o[t] = r[t]);
			await t.writeFile(e, JSON.stringify(o));
		}
	};
	I();
	const x = /* @__PURE__ */ new Map(), M = (v ??= (async () => {
		const t = "undefined" != typeof navigator ? navigator.storageBuckets : void 0;
		if (t && "function" == typeof t.open) {
			const { BucketProfileStorage: t } = await Promise.resolve().then(() => (_(), D));
			try {
				await u();
			} catch {}
			return new t();
		}
		if ("undefined" != typeof navigator && "function" == typeof navigator.storage.getDirectory) {
			const { OpfsSubdirProfileStorage: t } = await Promise.resolve().then(() => (O(), $));
			try {
				await u();
			} catch {}
			return new t();
		}
		const { IdbShimProfileStorage: e } = await Promise.resolve().then(() => (j(), F));
		return new e();
	})(), v), B = new Set([
		"NoModificationAllowedError",
		"NotAllowedError",
		"QuotaExceededError",
		"InvalidStateError",
		"AbortError",
		"SecurityError",
		"NotReadableError",
		"InvalidModificationError"
	]);
	self.addEventListener("connect", (t) => {
		for (const e of t.ports) e.addEventListener("message", (t) => {
			const r = t.data, o = r.profileId ?? "__default__";
			(async () => {
				try {
					const t = await p(o).execute(r);
					e.postMessage({
						id: r.id,
						ok: !0,
						value: t
					});
				} catch (t) {
					const { message: o, kind: i } = y(t);
					e.postMessage({
						id: r.id,
						ok: !1,
						error: o,
						errorKind: i
					});
				}
			})();
		}), e.start();
	});
})();
