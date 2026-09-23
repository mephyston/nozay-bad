<script lang="ts">
  import { ChoiceField, FormField, Input } from '@nba/ui';

  /**
   * Les champs d'une page : titre, rôle, adresse, et ce que les moteurs affichent.
   *
   * Une seule déclaration pour les deux formulaires. La création n'en proposait qu'un
   * — le titre — quand la modification en portait cinq : on créait une page sans
   * pouvoir lui donner son adresse, puis on rouvrait ses réglages pour le faire. Deux
   * markups auraient de toute façon fini par diverger, comme les libellés l'ont déjà
   * fait ailleurs dans ce dépôt.
   */
  let {
    titre = $bindable(''),
    adresse = $bindable(''),
    role = $bindable<'default' | 'home' | 'landing'>('default'),
    titreMoteurs = $bindable(''),
    descriptionMoteurs = $bindable(''),
    /** À la création, l'adresse se déduit du titre si on la laisse vide. */
    mode = 'edition',
    /** Ce que devient l'adresse, et la redirection qu'un changement entraîne. */
    aideAdresse,
    onInput
  }: {
    titre?: string;
    adresse?: string;
    role?: 'default' | 'home' | 'landing';
    titreMoteurs?: string;
    descriptionMoteurs?: string;
    mode?: 'creation' | 'edition';
    aideAdresse?: string;
    onInput?: () => void;
  } = $props();

  const uid = $props.id();

  const aide = $derived(
    aideAdresse ??
      (role === 'home'
        ? "La page d'accueil est servie à « / » ; son adresse reste enregistrée."
        : "Laissez vide pour la déduire du titre.")
  );
</script>

<div class="grid gap-4 sm:grid-cols-2">
  <FormField id={`${uid}-titre`} label="Titre">
    <Input id={`${uid}-titre`} bind:value={titre} oninput={onInput} placeholder="Présentation" />
  </FormField>

  <!--
    Deux valeurs seulement, et non les trois du schéma : `landing` n'est lu par aucun
    code de rendu — le site compose une page à partir de ses blocs, jamais de son
    gabarit. L'offrir donnerait un choix sans effet.
  -->
  <FormField id={`${uid}-role`} label="Rôle de la page">
    <ChoiceField
      id={`${uid}-role`}
      label="Rôle de la page"
      value={role}
      onChange={(v) => {
        role = v as 'default' | 'home' | 'landing';
        onInput?.();
      }}
      options={[
        { value: 'default', label: 'Page normale' },
        { value: 'home', label: "Page d'accueil", hint: 'Servie à la racine « / »' }
      ]}
    />
  </FormField>

  <div class="sm:col-span-2">
    <FormField id={`${uid}-adresse`} label="Adresse" hint={aide}>
      <Input
        id={`${uid}-adresse`}
        bind:value={adresse}
        oninput={onInput}
        disabled={role === 'home' && mode === 'edition'}
        placeholder="presentation"
      />
    </FormField>
  </div>

  <FormField id={`${uid}-seo-titre`} label="Titre pour les moteurs">
    <Input
      id={`${uid}-seo-titre`}
      bind:value={titreMoteurs}
      oninput={onInput}
      placeholder="Repris du titre si vide"
    />
  </FormField>

  <div class="sm:col-span-2">
    <FormField
      id={`${uid}-seo-description`}
      label="Description pour les moteurs"
      hint={`${descriptionMoteurs.length}/155 — à défaut, le début de la page sera utilisé.`}
    >
      <Input
        id={`${uid}-seo-description`}
        bind:value={descriptionMoteurs}
        oninput={onInput}
        placeholder="Une phrase de 150 caractères, affichée dans les résultats de recherche"
      />
    </FormField>
  </div>
</div>
