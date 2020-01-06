({ Enumerable, EqualityComparer } = (function () {
	/// wrapper class over iterable instances that exposes the methods usually found in .NET LINQ
	function Enumerable(src) {
		_ensureIterable(src);
		this._src = src;
		this._canSeek = false;
	}
	/// returns an empty Enumerable
	Enumerable.empty = function () {
		return new Enumerable([]);
	};
	/// generates a sequence of integral numbers within a specified range.
	Enumerable.range = function (start, count) {
		const f = function* () {
			for (let i = 0; i < count; i++) {
				yield start + i;
			}
		};
		return new Enumerable(f());
	}
	/// Generates a sequence that contains one repeated value.
	Enumerable.repeat = function (item, count) {
		const f = function* () {
			for (let i = 0; i < count; i++) {
				yield item;
			}
		};
		return new Enumerable(f());
	}
	/// Wraps an iterable item into an Enumerable if it's not already one
	Enumerable.from = function (iterable) {
		if (iterable instanceof Enumerable) return iterable;
		return new Enumerable(iterable);
	}
	Enumerable.prototype = {
		/// the Enumerable instance exposes the same iterator as the wrapped iterable
		[Symbol.iterator]() {
			const iterator = this._src[Symbol.iterator].bind(this._src);
			return iterator();
		},
		/// Applies an accumulator function over a sequence.
		/// The specified seed value is used as the initial accumulator value, and the specified function is used to select the result value.
		aggregate(acc, op) {
			_ensureFunction(op);
			for (const item of this) {
				acc = op(acc, item);
			}
			return acc;
		},
		/// Determines whether all elements of a sequence satisfy a condition.
		all(op) {
			_ensureFunction(op);
			return !this.any(x => !op(x));
		},
		/// Determines whether any element of a sequence exists or satisfies a condition.
		any(op) {
			_ensureFunction(op);
			for (const item of this) {
				if (op(item)) return true;
			}
			return false;
		},
		/// Appends a value to the end of the sequence.
		append(item) {
			return this.concat([item]);
		},
		/// Computes the average of a sequence of numeric values.
		average() {
			return this.sum() / this.count();
		},
		asEnumerable() {
			throw new Error('asEnumerable not implemented for Javascript');
		},
		cast() {
			throw new Error('cast not implemented for Javascript');
		},
		/// Concatenates two sequences by appending iterable to the existing one.
		concat(iterable) {
			_ensureIterable(iterable);
			const gen = function* () {
				for (const item of this) {
					yield item;
				}
				for (const item of iterable) {
					yield item;
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Determines whether a sequence contains a specified element.
		/// A custom function can be used to determine equality between elements.
		contains(item, equalityComparer = EqualityComparer.default) {
			_ensureFunction(equalityComparer);
			return this.any(x => equalityComparer(x, item));
		},
		/// Returns the number of elements in a sequence.
		count() {
			_ensureInternalCount(this);
			return this._count();
		},
		defaultIfEmpty() {
			throw new Error('defaultIfEmpty not implemented for Javascript');
		},
		/// Returns distinct elements from a sequence.
		distinct() {
			// TODO comparer function (probably a hashing function, rather than comparer)
			const distinctValues = new Set();
			const gen = function* () {
				for (const item of this) {
					const size = distinctValues.size;
					distinctValues.add(item);
					if (size < distinctValues.size) {
						yield item;
					}
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Returns the element at a specified index in a sequence.
		elementAt(index) {
			_ensureInternalTryGetAt(this);
			const result = this._tryGetAt(index);
			if (!result) throw new Error('Index out of range');
			return result.value;
		},
		/// Returns the element at a specified index in a sequence or a default value if the index is out of range.
		elementAtOrDefault(index) {
			_ensureInternalTryGetAt(this);
			const result = this._tryGetAt(index);
			if (!result) return undefined;
			return result.value;
		},
		/// Produces the set difference of two sequences
		except(iterable) {
			// TODO comparer function (probably a hashing function, rather than comparer)
			_ensureIterable(iterable);
			const distinctValues = new Set(iterable);
			const gen = function* () {
				for (const item of this) {
					if (!distinctValues.has(item)) yield item;
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Returns the first element of a sequence.
		first() {
			return this.elementAt(0);
		},
		/// Returns the first element of a sequence, or a default value if no element is found.
		firstOrDefault() {
			return this.elementAtOrDefault(0);
		},
		/// Groups the elements of a sequence.
		groupBy(keySelector) {
			_ensureFunction(keySelector);
			const result = new Map();
			for (const item of this) {
				const key = keySelector(item);
				const arr = result.get(key);
				if (arr) {
					arr.push(item);
				} else {
					result.set(key, [item]);
				}
			}
			const enumerable = new Enumerable(result);
			// TODO check the keys do not contain 'keys' and whatever members Enumerable has
			for (const pair of result) {
				enumerable[pair[0]] = pair[1];
			}
			enumerable.keys = Array.from(result.keys());
			return enumerable;
		},
		groupJoin() {
			throw new Error('groupJoin not implemented for Javascript');
		},
		/// Produces the set intersection of two sequences.
		intersect(iterable) {
			// TODO comparer function (probably a hashing function, rather than comparer)
			_ensureIterable(iterable);
			const distinctValues = new Set(iterable);
			const gen = function* () {
				for (const item of this) {
					if (distinctValues.has(item)) yield item;
				}
			}.bind(this);
			return new Enumerable(gen()).distinct();
		},
		join() {
			// TODO implement this?
			throw new Error('join is not implemented for Javascript')
		},
		/// Returns the last element of a sequence.
		last() {
			_ensureInternalTryGetAt(this);
			if (!this._canSeek) {
				let result = null;
				let found = false;
				for (const item of this) {
					result = item;
					found = true;
				}
				if (found) return result;
			}
			const count = this.count();
			return this.elementAt(count - 1);
		},
		/// Returns the last element of a sequence, or a default value if no element is found.
		lastOrDefault() {
			_ensureInternalTryGetAt(this);
			if (!this._canSeek) {
				let result = undefined;
				for (const item of this) {
					result = item;
				}
				return result;
			}
			const count = this.count();
			return this.elementAtOrDefault(count - 1);
		},
		/// same as count
		longCount() {
			return this.count();
		},
		/// Returns the maximum value in a sequence of values.
		/// A custom function can be used to establish order (the result 0 means equal, 1 means larger, -1 means smaller)
		max(comparer) {
			if (typeof comparer !== 'undefined') {
				_ensureFunction(comparer);
			} else {
				// TODO find a solution for comparison between numbers and strings
				comparer = (item1, item2) => item1 > item2 ? 1 : (item1 < item2 ? -1 : 0);
			}
			return this.aggregate(undefined, (acc, item) => acc === undefined || comparer(item, acc) > 0 ? item : acc);
		},
		/// Returns the minimum value in a sequence of values.
		/// A custom function can be used to establish order (the result 0 means equal, 1 means larger, -1 means smaller)
		min(comparer) {
			if (typeof comparer !== 'undefined') {
				_ensureFunction(comparer);
			} else {
				// TODO find a solution for comparison between numbers and strings
				comparer = (item1, item2) => item1 > item2 ? 1 : (item1 < item2 ? -1 : 0);
			}
			return this.aggregate(undefined, (acc, item) => acc === undefined || comparer(item, acc) < 0 ? item : acc);
		},
		/// Filters the elements of a sequence based on their type
		/// If type is a string, it will filter based on typeof, else it will use instanceof
		ofType(type) {
			// TODO check the utility of this method
			const f = typeof type === 'string'
				? x => typeof x === type
				: x => x instanceof type;
			const gen = function* () {
				for (const item of this) {
					if (f(item)) yield item;
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Sorts the elements of a sequence in ascending order.
		orderBy(comparer) {
			if (typeof comparer !== 'undefined') {
				_ensureFunction(comparer);
			}
			const gen = function* () {
				const arr = _toArray(this._src);
				arr.sort(comparer);
				for (const item of arr) {
					yield item;
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Sorts the elements of a sequence in descending order.
		orderByDescending(comparer) {
			return this.orderBy(comparer).reverse();
		},
		/// Adds a value to the beginning of the sequence.
		prepend(item) {
			return new Enumerable([item]).concat(this);
		},
		/// Inverts the order of the elements in a sequence.
		reverse() {
			_ensureInternalTryGetAt(this);
			const gen = !this._canSeek
				? function* () {
					const arr = _toArray(this._src);
					for (let index = arr.length - 1; index >= 0; index--) {
						yield arr[index];
					}
				}
				: function* () {
					const length = this.count();
					for (let index = length - 1; index >= 0; index--) {
						yield this.elementAt(index);
					}
				};
			return new Enumerable(gen.bind(this)());
		},
		/// Projects each element of a sequence into a new form.
		select(op) {
			_ensureFunction(op);
			const gen = function* () {
				for (const item of this) {
					yield op(item);
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Projects each element of a sequence to an iterable and flattens the resulting sequences into one sequence.
		selectMany(op) {
			if (typeof op !== 'undefined') {
				_ensureFunction(op);
			} else {
				op = x => x;
			}
			const gen = function* () {
				for (const item of this) {
					_ensureIterable(item);
					for (const child of op(item)) {
						yield child;
					}
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Determines whether two sequences are equal and in the same order according to an equality comparer.
		sequenceEqual(iterable, equalityComparer = EqualityComparer.default) {
			_ensureIterable(iterable);
			_ensureFunction(equalityComparer);
			const iterator1 = this[Symbol.iterator]();
			const iterator2 = iterable[Symbol.iterator]();
			let done = false;
			do {
				const val1 = iterator1.next();
				const val2 = iterator2.next();
				const equal = (val1.done && val2.done) || (!val1.done && !val2.done && equalityComparer(val1.value, val2.value));
				if (!equal) return false;
				done = val1.done;
			} while (!done);
			return true;
		},
		/// Returns the single element of a sequence and throws if it doesn't have exactly one
		single() {
			const iterator = this[Symbol.iterator]();
			let val = iterator.next();
			if (val.done) throw new Error('Sequence contains no elements');
			const result = val.value;
			val = iterator.next();
			if (!val.done) throw new Error('Sequence contains more than one element');
			return result;
		},
		/// Returns the single element of a sequence or undefined if none found. It throws if the sequence contains multiple items.
		singleOrDefault() {
			const iterator = this[Symbol.iterator]();
			let val = iterator.next();
			if (val.done) return undefined;
			const result = val.value;
			val = iterator.next();
			if (!val.done) throw new Error('Sequence contains more than one element');
			return result;
		},
		/// Bypasses a specified number of elements in a sequence and then returns the remaining elements.
		skip(nr) {
			const gen = function* () {
				for (const item of this) {
					if (nr > 0) {
						nr--;
					} else {
						yield item;
					}
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Returns a new enumerable collection that contains the elements from source with the last nr elements of the source collection omitted.
		skipLast(nr) {
			const gen = function* () {
				const buffer = Array(nr);
				let index = 0;
				let offset = 0;
				for (const item of this) {
					const value = buffer[index - offset];
					buffer[index - offset] = item;
					index++;
					if (index - offset >= nr) {
						offset += nr;
					}
					if (index > nr) {
						yield value;
					}
				}
				buffer.length = 0;
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Bypasses elements in a sequence as long as a specified condition is true and then returns the remaining elements.
		skipWhile(condition) {
			_ensureFunction(condition);
			let skip = true;
			const gen = function* () {
				for (const item of this) {
					if (skip && !condition(item)) {
						skip = false;
					}
					if (!skip) {
						yield item;
					}
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Computes the sum of a sequence of numeric values.
		sum() {
			return this.aggregate(undefined, (acc, item) => acc === undefined ? _toNumber(item) : _toNumber(acc) + _toNumber(item));
		},
		/// Returns a specified number of contiguous elements from the start of a sequence.
		take(nr) {
			const gen = function* () {
				for (const item of this) {
					if (nr > 0) {
						yield item;
						nr--;
					}
					if (nr <= 0) {
						break;
					}
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Returns a new enumerable collection that contains the last nr elements from source.
		takeLast(nr) {
			_ensureInternalTryGetAt(this);
			const gen = this._canSeek
				? function* () {
					const length = this.count();
					for (let index = length - nr; index < length; index++) {
						yield this.elementAt(index);
					}
				}
				: function* () {
					let index = 0;
					const buffer = Array(nr);
					for (const item of this) {
						buffer[index % nr] = item;
						index++;
					}
					for (let i = 0; i < nr && i < index; i++) {
						yield buffer[(index + i) % nr];
					}
				};
			return new Enumerable(gen.bind(this)());
		},
		/// Returns elements from a sequence as long as a specified condition is true, and then skips the remaining elements.
		takeWhile(condition) {
			_ensureFunction(condition);
			const gen = function* () {
				for (const item of this) {
					if (condition(item)) {
						yield item;
					} else {
						break;
					}
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		thenBy(comparer) {
			//TODO implement OrderedEnumerable?
			throw new Error('thenBy not implemented for Javascript');
		},
		thenByDescending(comparer) {
			//TODO implement OrderedEnumerable?
			throw new Error('thenByDescending not implemented for Javascript');
		},
		/// creates an array from an Enumerable
		toArray() {
			return Array.from(this);
		},
		toDictionary() {
			throw new Error('use toMap or toObject instead of toDictionary');
		},
		/// creates a map from an Enumerable
		toMap(keySelector, valueSelector = x => x) {
			_ensureFunction(keySelector);
			_ensureFunction(valueSelector);
			const result = new Map();
			for (const item of this) {
				result.set(keySelector(item), valueSelector(item));
			}
			return result;
		},
		/// creates an object from an enumerable
		toObject(keySelector, valueSelector = x => x) {
			_ensureFunction(keySelector);
			_ensureFunction(valueSelector);
			const result = {};
			for (const item of this) {
				result[keySelector(item)] = valueSelector(item);
			}
			return result;
		},
		toHashSet() {
			throw new Error('use toSet instead of toHashSet');
		},
		/// creates a set from an enumerable
		toSet() {
			// TODO comparer function (probably a hashing function, rather than comparer)
			const result = new Set();
			for (const item of this) {
				result.add(item);
			}
			return result;
		},
		toList() {
			throw new Error('toList not implemented for Javascript');
		},
		toLookup() {
			throw new Error('toLookup not implemented for Javascript');
		},
		/// Produces the set union of two sequences.
		union(iterable) {
			// TODO comparer function (probably a hashing function, rather than comparer)
			_ensureIterable(iterable);
			return this.concat(iterable).distinct();
		},
		/// Filters a sequence of values based on a predicate.
		where(op) {
			_ensureFunction(op);
			const gen = function* () {
				for (const item of this) {
					if (op(item)) {
						yield item;
					}
				}
			}.bind(this);
			return new Enumerable(gen());
		},
		/// Applies a specified function to the corresponding elements of two sequences, producing a sequence of the results.
		zip(iterable, zipper) {
			_ensureIterable(iterable);
			_ensureFunction(zipper);
			const gen = function* () {
				const iterator1 = this[Symbol.iterator]();
				const iterator2 = iterable[Symbol.iterator]();
				let done = false;
				do {
					const val1 = iterator1.next();
					const val2 = iterator2.next();
					done = val1.done || val2.done;
					if (!done) {
						yield zipper(val1.value, val2.value);
					}
				} while (!done);
			}.bind(this);
			return new Enumerable(gen());
		}
	};

	function _ensureIterable(src) {
		if (!src || !src[Symbol.iterator]) throw new Error('the argument must be iterable!');
	}
	function _ensureFunction(f) {
		if (!f || typeof f !== 'function') throw new Error('the argument needs to be a function!');
	}
	function _toNumber(obj) {
		return typeof obj === 'number'
			? obj
			: Number.NaN;
	}
	function _toArray(enumerable) {
		if (Array.isArray(enumerable)) return enumerable;
		return Array.from(enumerable);
	}
	function _ensureInternalCount(enumerable) {
		if (enumerable._count) return;
		if (typeof enumerable._src.length === 'number') {
			enumerable._count = () => enumerable._src.length;
			return;
		}
		if (typeof enumerable._src.size === 'number') {
			enumerable._count = () => enumerable._src.size;
			return;
		}
		enumerable._count = () => {
			let x = 0;
			for (const item of enumerable._src) x++;
			return x;
		};
	}
	function _ensureInternalTryGetAt(enumerable) {
		if (enumerable._tryGetAt) return;
		this._canSeek = true;
		if (typeof enumerable._src === 'string') {
			enumerable._tryGetAt = index => {
				if (index < enumerable._src.length) {
					return { value: enumerable._src.charAt(index) };
				}
				return null;
			};
			return;
		}
		if (Array.isArray(enumerable._src)) {
			enumerable._tryGetAt = index => {
				if (index >= 0 && index < enumerable._src.length) {
					return { value: enumerable._src[index] };
				}
				return null;
			};
			return;
		}
		if (typeof enumerable._src.length === 'number') {
			enumerable._tryGetAt = index => {
				if (index < enumerable._src.length && typeof enumerable._src[index] !== 'undefined') {
					return { value: enumerable._src[index] };
				}
				return null;
			};
			return;
		}
		this._canSeek = false;
		// TODO other specialized types? objects, maps, sets?
		enumerable._tryGetAt = index => {
			let x = 0;
			for (const item of enumerable._src) {
				if (index === x) return { value: item };
				x++;
			}
			return null;
		}
	}

	const EqualityComparer = {
		default: (item1, item2) => item1 == item2,
		exact: (item1, item2) => item1 === item2,
	}
	return { Enumerable, EqualityComparer };
})());
